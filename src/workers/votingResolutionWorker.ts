import { Queue, Worker, type Job } from "bullmq";
import mongoose from "mongoose";
import Order, { type IOrder } from "../models/Order.js";
import Product, { type IProduct } from "../models/Product.js";
import Squad from "../models/Squad.js";
import Transaction, { type ITransaction } from "../models/Transaction.js";
import {
  EscrowState as EscrowStateEnum,
  PaymentMethod as PaymentMethodEnum,
  PurchaseType as PurchaseTypeEnum,
  OrderLogisticsStatus as LogisticsEnum,
  SquadStatus as SquadStatusEnum,
} from "../types/enums.js";
import { captureFunds, voidFunds } from "../utils/safepay.js";
import { computeOrderFinance, roundPKR } from "../utils/orderFinance.js";

/* ------------------------------------------------------------------ */
/* Redis connection                                                   */
/* ------------------------------------------------------------------ */

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not set in the environment.");
}

/** Queue that fires when a squad's 2-hour voting window closes. */
export const votingResolutionQueue = new Queue("voting-resolution", {
  connection: { url: redisUrl },
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 10_000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

/* ------------------------------------------------------------------ */
/* Job data                                                           */
/* ------------------------------------------------------------------ */

interface VotingResolutionJobData {
  squadId: string;
}

/* ------------------------------------------------------------------ */
/* Finance helpers                                                   */
/* ------------------------------------------------------------------ */

interface ResolvedFinance {
  totals: IOrder["totals"];
  unitPrice: number;
}

/**
 * Computes the locked price and finance snapshot for one squad member.
 *
 * Dynamic discount formula (per PROJECT_CONTEXT.md §3):
 *   discount = (currentMembers / targetMembers) * maxSquadDiscount
 * anchored against the retail price, never the wholesale cost. The rate is
 * capped at the product's maxSquadDiscount and floored at 0.
 */
function computeSquadMemberFinance(
  product: IProduct,
  squad: { currentMembers: number; targetMembers: number },
  depositPaid: number,
): ResolvedFinance {
  const achievedRate = Math.min(
    product.pricing.maxSquadDiscount,
    (squad.currentMembers / squad.targetMembers) * product.pricing.maxSquadDiscount,
  );

  const unitPrice = roundPKR(product.pricing.currentRetailPrice);
  const totals = computeOrderFinance({
    unitPrice,
    quantity: 1,
    discountRate: roundPKR(achievedRate),
    shipping: 0,
    platformFee: 0,
    depositPaid,
  });

  return { totals, unitPrice };
}

/* ------------------------------------------------------------------ */
/* Worker processor                                                   */
/* ------------------------------------------------------------------ */

/**
 * Final resolution of a squad after the 2-hour voting window closes.
 *
 * For every member transaction tied to the squad:
 *   - Proceed (or no vote recorded): capture the 10% hold via Safepay and
 *     generate a Squad purchase Order with the dynamic discount locked in.
 *   - OptOut: ensure the hold is voided (the vote handler already voids, so
 *     this is a defensive idempotent check) and skip order generation.
 *
 * The squad ends as Captured (at least one valid order) or Voided (everyone
 * opted out). Everything runs in a Mongoose transaction so a failure can't
 * leave captured funds without a corresponding order.
 */
async function processVotingResolution(job: Job<VotingResolutionJobData>): Promise<void> {
  const { squadId } = job.data;
  console.info(`[votingWorker] processing squad ${squadId} (job ${job.id})`);

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const squad = await Squad.findById(squadId).session(session);
      if (!squad) {
        console.warn(`[votingWorker] squad ${squadId} not found — discarding job.`);
        return;
      }
      if (squad.status !== SquadStatusEnum.Voting) {
        console.info(
          `[votingWorker] squad ${squadId} status is ${squad.status} — no action.`,
        );
        return;
      }

      const product = await Product.findById(squad.productId).session(session);
      if (!product) {
        throw new Error(`Product ${squad.productId} missing for squad ${squadId}`);
      }

      // Lock the achieved discount rate onto the squad document.
      const achievedRate = roundPKR(
        Math.min(
          product.pricing.maxSquadDiscount,
          (squad.currentMembers / squad.targetMembers) * product.pricing.maxSquadDiscount,
        ),
      );
      squad.finalDiscountRate = achievedRate;

      // Load every member transaction for this squad in one query.
      const txnIds = squad.members.map((m) => m.depositTransactionId);
      const transactions = await Transaction.find({ _id: { $in: txnIds } }).session(session);
      const txnByMember = new Map<string, ITransaction>();
      for (const t of transactions) {
        txnByMember.set(t._id.toString(), t);
      }

      const ordersToCreate: Array<typeof Order.prototype> = [];
      let proceedingCount = 0;

      for (const member of squad.members) {
        const txn = txnByMember.get(member.depositTransactionId.toString());
        if (!txn) {
          console.warn(
            `[votingWorker] missing transaction ${member.depositTransactionId} for squad ${squadId}`,
          );
          continue;
        }

        // No vote recorded defaults to Proceed per the spec.
        const isProceeding = member.vote !== "OptOut";

        if (!isProceeding) {
          if (txn.escrowState !== EscrowStateEnum.Voided) {
            await voidFunds(txn.safepayTrackerId);
            txn.escrowState = EscrowStateEnum.Voided;
            txn.voidedAt = new Date();
            await txn.save({ session });
          }
          continue;
        }

        // Proceed: capture the hold and generate the order.
        if (txn.escrowState !== EscrowStateEnum.Captured) {
          await captureFunds(txn.safepayTrackerId, txn.holdAmount);
          txn.escrowState = EscrowStateEnum.Captured;
          txn.capturedAt = new Date();
          txn.buyerVote = txn.buyerVote ?? "Proceed";
          await txn.save({ session });
        }

        const { totals } = computeSquadMemberFinance(
          product,
          { currentMembers: squad.currentMembers, targetMembers: squad.targetMembers },
          txn.holdAmount,
        );

        ordersToCreate.push(
          new Order({
            buyerId: member.userId,
            supplierId: product.supplierId,
            productId: product._id,
            squadId: squad._id,
            transactionId: txn._id,
            purchaseType: PurchaseTypeEnum.Squad,
            totals,
            paymentMethod: PaymentMethodEnum.SquadDeposit,
            logisticsStatus: LogisticsEnum.PendingDispatch,
          }),
        );
        proceedingCount += 1;
      }

      if (ordersToCreate.length > 0) {
        await Order.insertMany(ordersToCreate, { session });
      }

      // Resolve the squad: Captured if anyone proceeded, else Voided.
      if (proceedingCount > 0) {
        squad.status = SquadStatusEnum.Captured;
        squad.capturedAt = squad.capturedAt ?? new Date();
      } else {
        squad.status = SquadStatusEnum.Voided;
        squad.voidedAt = new Date();
      }
      await squad.save({ session });

      console.info(
        `[votingWorker] squad ${squadId} resolved as ${squad.status} ` +
          `(${proceedingCount} orders, ${squad.members.length - proceedingCount} opt-outs).`,
      );
    });
  } finally {
    await session.endSession();
  }
}

/** BullMQ worker instance. */
export const votingWorker = new Worker<VotingResolutionJobData>(
  "voting-resolution",
  processVotingResolution,
  {
    connection: { url: redisUrl },
    concurrency: 5,
  },
);

votingWorker.on("completed", (job) => {
  console.info(`[votingWorker] job ${job.id} completed.`);
});

votingWorker.on("failed", (job, err) => {
  console.error(`[votingWorker] job ${job?.id} failed: ${err.message}`);
});

/** Graceful shutdown — called from squadWorker.closeSquadWorker(). */
export async function closeVotingWorker(): Promise<void> {
  await votingWorker.close();
  await votingResolutionQueue.close();
}

// Keep the Types import alive for downstream consumers that build job data.
export type { VotingResolutionJobData };
