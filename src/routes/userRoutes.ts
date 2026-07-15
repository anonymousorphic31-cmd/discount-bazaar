import { Router } from "express";
import { getSuppliers } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Admin-only — pick a supplier to attribute a direct listing to.
router.get("/suppliers", requireAuth, requireRole("Admin"), getSuppliers);

export default router;
