import { type Request, type Response } from "express";
import { Types } from "mongoose";
import Squad from "../models/Squad.js";
import Transaction from "../models/Transaction.js";
import { EscrowState as EscrowStateEnum, SquadStatus as SquadStatusEnum } from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { voidFunds } from "../utils/safepay.js";

/* ------------------------------------------------------------------ */
/* Step 2.2 — getActiveSquads                                         */
/* ------------------------------------------------------------------ */

interface GetActiveSquadsQuery {
  page?: string;
  limit?: string;
}

/**
 * GET /api/squads
 * Public. Returns a paginated feed of Gathering squads with product details
 * populated, for the homepage "Trending Squads" rail.
 */
export const getActiveSquads = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { page, limit } = req.query as GetActiveSquadsQuery;

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const filter = { status: SquadStatusEnum.Gathering };

    const [items, total] = await Promise.all([
      Squad.find(filter)
        .populate({ path: "productId", select: "title slug images category pricing" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Squad.countDocuments(filter),
    ]);

    res.status(200).json({
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 0,
      },
    });
  },
);

/* ------------------------------------------------------------------ */
/* Step 2.3 — getMySquads                                             */
/* ------------------------------------------------------------------ */

/**
 * GET /api/squads/me
 * Protected. Returns every squad the authenticated user has joined, resolved
 * by looking up their Authorized transactions and matching squadIds.
 */
export const getMySquads = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const buyerId = req.user?.userId;
    if (!buyerId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    // Find squads whose member list includes this buyer.
    const squads = await Squad.find({
      "members.userId": new Types.ObjectId(buyerId),
    })
      .populate({ path: "productId", select: "title slug images category pricing" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: squads });
  },
);

/* ------------------------------------------------------------------ */
/* Step 2.4 — submitVote                                              */
/* ------------------------------------------------------------------ */

interface VoteBody {
  vote?: string;
}

/**
 * POST /api/squads/:id/vote
 * Protected. Records the buyer's vote (Proceed | OptOut) on the squad.
 * On OptOut the buyer's authorized hold is voided via Safepay.
 */
export const submitVote = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { vote } = req.body as VoteBody;
    const buyerId = req.user?.userId;

    if (!buyerId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "A valid squad id is required." });
      return;
    }
    if (vote !== "Proceed" && vote !== "Opt_Out" && vote !== "OptOut") {
      res.status(400).json({ error: "vote must be 'Proceed' or 'Opt_Out'." });
      return;
    }

    const normalizedVote = vote === "Opt_Out" ? "OptOut" : ("Proceed" as "Proceed" | "OptOut");

    const squad = await Squad.findById(id);
    if (!squad) {
      res.status(404).json({ error: "Squad not found." });
      return;
    }
    if (squad.status !== SquadStatusEnum.Voting) {
      res.status(409).json({ error: "This squad is not in the voting phase." });
      return;
    }

    const member = squad.members.find(
      (m) => m.userId.toString() === buyerId,
    );
    if (!member) {
      res.status(403).json({ error: "You are not a member of this squad." });
      return;
    }
    if (member.vote) {
      res.status(409).json({ error: "You have already voted." });
      return;
    }

    // Persist the vote on the squad member and on the originating transaction.
    member.vote = normalizedVote;
    await squad.save();

    const transaction = await Transaction.findById(member.depositTransactionId);
    if (!transaction) {
      res.status(500).json({ error: "Deposit transaction not found for this membership." });
      return;
    }
    transaction.buyerVote = normalizedVote;

    if (normalizedVote === "OptOut") {
      // Release this buyer's specific hold via Safepay.
      await voidFunds(transaction.safepayTrackerId);
      transaction.escrowState = EscrowStateEnum.Voided;
      transaction.voidedAt = new Date();
    }

    await transaction.save();

    res.status(200).json({
      message: "Vote recorded.",
      data: {
        squadId: squad._id,
        vote: normalizedVote,
        transactionState: transaction.escrowState,
      },
    });
  },
);
