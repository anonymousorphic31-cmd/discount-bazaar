import { Router } from "express";
import {
  createProduct,
  getAllProducts,
  getCategories,
  getProductById,
} from "../controllers/productController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Public catalog reads (order matters — /categories must win over /:id)
router.get("/", getAllProducts);
router.get("/categories", getCategories);
router.get("/:id", getProductById);

// Admin-only direct upload
router.post(
  "/admin/upload",
  requireAuth,
  requireRole("Admin"),
  createProduct,
);

export default router;
