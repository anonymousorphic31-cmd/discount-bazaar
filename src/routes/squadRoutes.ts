import { Router } from "express";
import { getActiveSquads, getMySquads, submitVote } from "../controllers/squadController.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

const router = Router();

// Public — homepage squad feed.
router.get("/", getActiveSquads);

// Protected — squads the authenticated buyer has joined.
router.get("/me", requireAuth, getMySquads);

// Protected — cast a vote during a squad's Voting phase.
router.post("/:id/vote", requireAuth, submitVote);

export default router;
