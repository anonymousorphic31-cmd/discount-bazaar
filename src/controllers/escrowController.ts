import { type Request, type Response } from "express";
import mongoose, { Types } from "mongoose";
import Product from "../models/Product.js";
import Squad from "../models/Squad.js";
import Transaction, { type ITransaction } from "../models/Transaction.js";
import { EscrowState as EscrowStateEnum, SquadStatus as SquadStatusEnum } from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  captureFunds,
  createAuthorization,
  verifyWebhookSignature,
  voidFunds,
} from "../utils/safepay.js";
import { squadResolutionQueue } from "../workers/squadWorker.js";

/* ------------------------------------------------------------------ */
/* Step 1.2 — initiateCheckout                                        */
/* ------------------------------------------------------------------ */

interface InitiateCheckoutBody {
  productId?: string;
  squadId?: string;
}

/**
 * POST /api/escrow/checkout
 * Protected. Accepts a productId and an optional squadId, computes the 10%
 * deposit against the product's market anchor price, and returns a mock
 * Safepay hosted-checkout URL with intent: "AUTHORIZE".
 */
export const initiateCheckout = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { productId, squadId } = req.body as InitiateCheckoutBody;
    const buyerId = req.user?.userId;

    if (!buyerId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!productId || !Types.ObjectId.isValid(productId)) {
      res.status(400).json({ error: "A valid productId is required." });
      return;
    }

    const product = await Product.findOne({ _id: productId, isActive: true }).lean();
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    // If joining an existing squad, validate it is still gathering.
    if (squadId) {
      if (!Types.ObjectId.isValid(squadId)) {
        res.status(400).json({ error: "Invalid squadId." });
        return;
      }
      const squad = await Squad.findById(squadId).lean();
      if (!squad) {
        res.status(404).json({ error: "Squad not found." });
        return;
      }
      if (squad.status !== SquadStatusEnum.Gathering) {
        res.status(409).json({ error: "This squad is no longer accepting members." });
        return;
      }
      if (squad.currentMembers >= squad.targetMembers) {
        res.status(409).json({ error: "Squad is already full." });
        return;
      }
    }

    const holdAmount = Math.round(product.pricing.marketAnchorPrice * 0.1 * 100) / 100;
    const reference = `p_${productId}_b_${buyerId}_${Date.now().toString(36)}`;

    const { trackerId, checkoutUrl } = await createAuthorization({
      amount: holdAmount,
      intent: "AUTHORIZE",
      reference,
      productId,
      squadId,
    });

    res.status(200).json({
      message: "Checkout initiated. Redirect the buyer to checkoutUrl to authorize the hold.",
      data: {
        trackerId,
        checkoutUrl,
        holdAmount,
        productId,
        squadId: squadId ?? null,
      },
    });
  },
);

/* ------------------------------------------------------------------ */
/* Step 1.3 — safepayWebhook                                          */
/* ------------------------------------------------------------------ */

interface SafepayWebhookPayload {
  event?: string;
  data?: {
    tracker_id?: string;
    amount?: number;
    metadata?: {
      productId?: string;
      squadId?: string;
      buyerId?: string;
    };
  };
}

/**
 * POST /api/escrow/webhook
 * Public. Receives Safepay authorization events. On `authorization.success`
 * it persists an Authorized transaction and reconciles squad membership.
 */
export const safepayWebhook = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["safepay-signature"] as string | undefined;
    const rawBody = JSON.stringify(req.body ?? {});

    if (!verifyWebhookSignature(signature, rawBody)) {
      res.status(401).json({ error: "Invalid webhook signature." });
      return;
    }

    const payload = req.body as SafepayWebhookPayload;
    const event = payload.event;
    const trackerId = payload.data?.tracker_id;
    const amount = payload.data?.amount ?? 0;
    const metadata = payload.data?.metadata ?? {};

    if (!event || !trackerId) {
      res.status(400).json({ error: "Malformed webhook payload." });
      return;
    }

    if (event !== "authorization.success") {
      // Acknowledge unhandled events so Safepay doesn't retry them.
      console.info(`[escrow webhook] ignoring event: ${event}`);
      res.status(200).json({ received: true, event });
      return;
    }

    const { productId, squadId, buyerId } = metadata;
    if (!productId || !buyerId) {
      res.status(400).json({ error: "Webhook metadata missing productId/buyerId." });
      return;
    }

    let txn: ITransaction | null = null;
    try {
      // The webhook reconciles three collections in one atomic unit: it
      // records the authorization, joins (or creates) the squad, and — if
      // the squad fills — locks it in for capture. A session guarantees we
      // don't leave a half-joined squad if any step fails.
      const session = await mongoose.startSession();
      try {
        txn = await session.withTransaction(async () => {
          // Idempotency: a retried webhook for the same tracker must not
          // double-count members.
          const existing = await Transaction.findOne({ safepayTrackerId: trackerId }).session(session);
          if (existing) {
            return existing;
          }

          const transaction = await Transaction.create(
            [
              {
                safepayTrackerId: trackerId,
                buyerId: new Types.ObjectId(buyerId),
                productId: new Types.ObjectId(productId),
                squadId: squadId ? new Types.ObjectId(squadId) : undefined,
                holdAmount: amount,
                escrowState: EscrowStateEnum.Authorized,
                authorizedAt: new Date(),
                webhookEvents: [{ event, receivedAt: new Date(), rawPayload: payload }],
              },
            ],
            { session },
          );
          const created = transaction[0];

          let targetSquadId: Types.ObjectId;

          if (squadId) {
            const squad = await Squad.findById(squadId).session(session);
            if (!squad) {
              throw new Error(`Webhook referenced missing squad ${squadId}`);
            }
            squad.members.push({
              userId: new Types.ObjectId(buyerId),
              joinedAt: new Date(),
              depositTransactionId: created._id,
            });
            squad.currentMembers += 1;
            if (squad.currentMembers >= squad.targetMembers) {
              squad.status = SquadStatusEnum.Captured;
              squad.capturedAt = new Date();
            }
            await squad.save({ session });
            targetSquadId = squad._id;
          } else {
            const newSquad = await Squad.create(
              [
                {
                  productId: new Types.ObjectId(productId),
                  targetMembers: 30,
                  currentMembers: 1,
                  members: [
                    {
                      userId: new Types.ObjectId(buyerId),
                      joinedAt: new Date(),
                      depositTransactionId: created._id,
                    },
                  ],
                  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                  status: SquadStatusEnum.Gathering,
                },
              ],
              { session },
            );
            targetSquadId = newSquad[0]._id;
          }

          // Schedule the 24-hour resolution check for this squad.
          await squadResolutionQueue.add(
            "squad-resolution",
            { squadId: targetSquadId.toString() },
            { delay: 24 * 60 * 60 * 1000, jobId: `squad_${targetSquadId}` },
          );

          return created;
        });
      } finally {
        await session.endSession();
      }

      res.status(200).json({ received: true, trackerId, transactionId: txn?._id });
    } catch (err) {
      console.error("[escrow webhook] transaction failed:", err);
      res.status(500).json({ error: "Failed to process authorization webhook." });
    }
  },
);

/* ------------------------------------------------------------------ */
/* Step 1.4 — adminForceCapture / adminForceVoid                      */
/* ------------------------------------------------------------------ */

interface AdminTransactionParams {
  id?: string;
}

/**
 * POST /api/escrow/admin/:id/capture
 * Admin-only. Captures the authorized hold for a transaction.
 */
export const adminForceCapture = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as AdminTransactionParams;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "A valid transaction id is required." });
      return;
    }

    const txn = await Transaction.findById(id);
    if (!txn) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }
    if (txn.escrowState === EscrowStateEnum.Captured) {
      res.status(409).json({ error: "Transaction is already captured." });
      return;
    }
    if (txn.escrowState === EscrowStateEnum.Voided) {
      res.status(409).json({ error: "Cannot capture a voided transaction." });
      return;
    }

    await captureFunds(txn.safepayTrackerId, txn.holdAmount);
    txn.escrowState = EscrowStateEnum.Captured;
    txn.capturedAt = new Date();
    await txn.save();

    res.status(200).json({
      message: "Funds captured.",
      data: { transactionId: txn._id, escrowState: txn.escrowState },
    });
  },
);

/**
 * POST /api/escrow/admin/:id/void
 * Admin-only. Releases the authorized hold for a transaction.
 */
export const adminForceVoid = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params as AdminTransactionParams;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "A valid transaction id is required." });
      return;
    }

    const txn = await Transaction.findById(id);
    if (!txn) {
      res.status(404).json({ error: "Transaction not found." });
      return;
    }
    if (txn.escrowState === EscrowStateEnum.Voided) {
      res.status(409).json({ error: "Transaction is already voided." });
      return;
    }

    await voidFunds(txn.safepayTrackerId);
    txn.escrowState = EscrowStateEnum.Voided;
    txn.voidedAt = new Date();
    await txn.save();

    res.status(200).json({
      message: "Funds voided.",
      data: { transactionId: txn._id, escrowState: txn.escrowState },
    });
  },
);
