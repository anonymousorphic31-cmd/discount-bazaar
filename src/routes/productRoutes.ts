import { Router, type Request, type Response, type NextFunction } from "express";
import {
  approveProduct,
  deleteAdminProduct,
  createProduct,
  getAdminProducts,
  getAllProducts,
  getCategories,
  getPendingProducts,
  getProductById,
  getSupplierMyDeals,
  proposeProduct,
  rejectProduct,
  updateAdminProduct,
  updateSupplierStock,
} from "../controllers/productController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";
import { uploadMedia } from "../utils/multerConfig.js";

const router = Router();

// Public catalog reads (order matters — /categories must win over /:id)
router.get("/", getAllProducts);
router.get("/categories", getCategories);

// Admin-only direct upload — accepts multipart/form-data with up to 4 media files
router.post(
  "/admin/upload",
  requireAuth,
  requireRole("Admin"),
  (req: Request, res: Response, next: NextFunction) => {
    uploadMedia(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : "File upload error." });
        return;
      }
      next();
    });
  },
  createProduct,
);

// Admin-only proposal review queue
router.get("/admin/pending", requireAuth, requireRole("Admin"), getPendingProducts);
router.get("/admin/all", requireAuth, requireRole("Admin"), getAdminProducts);
router.put("/admin/:id", requireAuth, requireRole("Admin"), updateAdminProduct);
router.delete("/admin/:id", requireAuth, requireRole("Admin"), deleteAdminProduct);

// Supplier-only: propose a new product for admin review
router.put("/supplier/propose", requireAuth, requireRole("Supplier"), proposeProduct);

// Supplier-only: view own deals grouped by status + update stock
router.get("/supplier/my-deals", requireAuth, requireRole("Supplier"), getSupplierMyDeals);
router.patch("/supplier/:id/stock", requireAuth, requireRole("Supplier"), updateSupplierStock);

router.get("/:id", getProductById);

// Admin-only: approve/reject a pending supplier proposal
router.put("/:id/approve", requireAuth, requireRole("Admin"), approveProduct);
router.put("/:id/reject", requireAuth, requireRole("Admin"), rejectProduct);

export default router;
