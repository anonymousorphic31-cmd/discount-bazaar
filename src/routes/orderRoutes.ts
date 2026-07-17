import { Router } from "express";
import {
  adminCancelOrder,
  createStandardOrder,
  courierWebhook,
  getAdminDispatchedOrders,
  getBuyerOrders,
  getSupplierManifests,
  updateOrderTracking,
} from "../controllers/orderController.js";
import { requireAuth, requireRole } from "../middlewares/authMiddleware.js";

const router = Router();

// Public — courier webhook (Trax / Leopards) for logistics status sync.
router.post("/webhook", courierWebhook);

// Protected — buyer creates a standard "Buy Now" order.
router.post("/", requireAuth, createStandardOrder);

// Protected — buyer's order history.
router.get("/me", requireAuth, getBuyerOrders);

// Protected (Supplier) — pending-dispatch manifest for the supplier's products.
router.get("/manifest", requireAuth, requireRole("Supplier"), getSupplierManifests);

// Protected (Supplier) — attach a courier tracking number to an order.
router.put("/:id/tracking", requireAuth, requireRole("Supplier"), updateOrderTracking);

// Admin-only — view all dispatched orders + cancel an order.
router.get("/admin/dispatched", requireAuth, requireRole("Admin"), getAdminDispatchedOrders);
router.put("/admin/:id/cancel", requireAuth, requireRole("Admin"), adminCancelOrder);

export default router;
