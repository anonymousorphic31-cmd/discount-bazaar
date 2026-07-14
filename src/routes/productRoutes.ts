import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
} from "../controllers/productController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Public catalog reads
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Admin-only direct upload
router.post(
  "/admin/upload",
  requireAuth,
  requireRole("Admin"),
  createProduct,
);

export default router;
