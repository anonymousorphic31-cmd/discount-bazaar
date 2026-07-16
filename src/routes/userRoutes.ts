import { Router } from "express";
import {
  getSupplierApplications,
  getSuppliers,
  messageSupplier,
  resolveSupplierApplication,
  submitSupplierVerification,
} from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Admin-only — pick a supplier to attribute a direct listing to.
router.get("/suppliers", requireAuth, requireRole("Admin"), getSuppliers);

// Supplier self-service — submit business verification (KYC)
router.put("/supplier/verify", requireAuth, requireRole("Supplier"), submitSupplierVerification);

// Admin-only — review supplier applications.
router.get("/supplier-applications", requireAuth, requireRole("Admin"), getSupplierApplications);
router.patch("/supplier-applications/:id/decision", requireAuth, requireRole("Admin"), resolveSupplierApplication);
router.post("/supplier-applications/:id/message", requireAuth, requireRole("Admin"), messageSupplier);

export default router;
