import { Router } from "express";
import {
  adminForceCapture,
  adminForceVoid,
  initiateCheckout,
  safepayWebhook,
} from "../controllers/escrowController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Public webhook — Safepay calls this, no JWT.
router.post("/webhook", safepayWebhook);

// Protected — buyer initiates a 10% deposit checkout.
router.post("/checkout", requireAuth, initiateCheckout);

// Admin-only escrow overrides.
router.post("/admin/:id/capture", requireAuth, requireRole("Admin"), adminForceCapture);
router.post("/admin/:id/void", requireAuth, requireRole("Admin"), adminForceVoid);

export default router;
