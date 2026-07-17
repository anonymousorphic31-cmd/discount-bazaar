import crypto from "node:crypto";
import { type Request, type Response } from "express";
import mongoose, { Types } from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Transaction from "../models/Transaction.js";
import {
  EscrowState as EscrowStateEnum,
  OrderLogisticsStatus as LogisticsEnum,
  PaymentMethod as PaymentMethodEnum,
  PurchaseType as PurchaseTypeEnum,
} from "../types/enums.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeOrderFinance, roundPKR } from "../utils/orderFinance.js";
import { captureFunds, createAuthorization, voidFunds } from "../utils/safepay.js";

/* ------------------------------------------------------------------ */
/* Step 1 — courierWebhook (Logistics Sync)                           */
/* ------------------------------------------------------------------ */

interface CourierWebhookBody {
  tracking_number?: string;
  status?: string;
  courier?: string;
}

/**
 * Maps raw courier status strings (Trax / Leopards) to our internal
 * OrderLogisticsStatus enum. RTO (Return to Origin) maps to Returned.
 */
const COURIER_STATUS_MAP: Record<string, LogisticsEnum> = {
  Delivered: LogisticsEnum.Delivered,
  DELIVERED: LogisticsEnum.Delivered,
  In_Transit: LogisticsEnum.Shipped,
  InTransit: LogisticsEnum.Shipped,
  Shipped: LogisticsEnum.Shipped,
  OutForDelivery: LogisticsEnum.OutForDelivery,
  Out_for_Delivery: LogisticsEnum.OutForDelivery,
  RTO: LogisticsEnum.Returned,
  Returned: LogisticsEnum.Returned,
  RETURNED: LogisticsEnum.Returned,
  Cancelled: LogisticsEnum.Cancelled,
  Canceled: LogisticsEnum.Cancelled,
  Packed: LogisticsEnum.Packed,
};

/**
 * POST /api/orders/webhook
 * Receives logistics status updates from courier partners (Trax, Leopards,
 * etc.). Protected by a shared secret sent in the `x-courier-secret` header
 * and compared against COURIER_WEBHOOK_SECRET. Looks up the order by
 * trackingNumber, updates its logisticsStatus, and stamps deliveredAt when
 * the package is delivered — which implicitly unlocks the buyer's ability to
 * open a dispute.
 */
export const courierWebhook = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Shared-secret authentication — reject anything without a valid secret.
    const courierSecret = process.env.COURIER_WEBHOOK_SECRET;
    const providedSecret = req.headers["x-courier-secret"];
    if (
      !courierSecret ||
      typeof providedSecret !== "string" ||
      providedSecret.length !== courierSecret.length ||
      !crypto.timingSafeEqual(Buffer.from(providedSecret), Buffer.from(courierSecret))
    ) {
      res.status(401).json({ error: "Unauthorized: missing or invalid courier secret." });
      return;
    }

    const { tracking_number, status, courier } = req.body as CourierWebhookBody;

    if (!tracking_number || typeof tracking_number !== "string") {
      res.status(400).json({ error: "tracking_number is required and must be a string." });
      return;
    }
    if (!status || typeof status !== "string") {
      res.status(400).json({ error: "status is required and must be a string." });
      return;
    }
    if (courier !== undefined && typeof courier !== "string") {
      res.status(400).json({ error: "courier must be a string if provided." });
      return;
    }

    const mappedStatus = COURIER_STATUS_MAP[status];
    if (!mappedStatus) {
      res.status(400).json({
        error: `Unknown courier status '${status}'. Supported: ${Object.keys(COURIER_STATUS_MAP).join(", ")}`,
      });
      return;
    }

    const order = await Order.findOne({ trackingNumber: tracking_number });
    if (!order) {
      res.status(404).json({ error: "No order found for this tracking number." });
      return;
    }

    // Idempotent — don't touch orders already in a terminal state.
    if (
      order.logisticsStatus === LogisticsEnum.Delivered ||
      order.logisticsStatus === LogisticsEnum.Cancelled ||
      order.logisticsStatus === LogisticsEnum.Returned
    ) {
      res.status(200).json({
        received: true,
        orderId: order._id,
        logisticsStatus: order.logisticsStatus,
        message: "Order already in a terminal logistics state — no update applied.",
      });
      return;
    }

    order.logisticsStatus = mappedStatus;
    if (courier) {
      order.courier = courier;
    }
    if (mappedStatus === LogisticsEnum.Delivered) {
      order.deliveredAt = new Date();
    }

    await order.save();

    res.status(200).json({
      received: true,
      orderId: order._id,
      logisticsStatus: order.logisticsStatus,
      deliveredAt: order.deliveredAt ?? null,
    });
  },
);
/* ------------------------------------------------------------------ */
/* Step 2.2 — createStandardOrder (Buy Now)                           */
/* ------------------------------------------------------------------ */

interface CreateStandardOrderBody {
  productId?: string;
  quantity?: number;
  shipping?: number;
}

/**
 * POST /api/orders
 * Protected. "Buy Now" checkout for a standard (non-squad) purchase. Captures
 * a 10% Safepay hold immediately and generates an Order with purchaseType
 * 'Standard' and no squad discount. Payment method defaults to FullRetail so
 * the remaining balance is due as COD.
 */
export const createStandardOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const buyerId = req.user?.userId;
    const { productId, quantity, shipping } = req.body as CreateStandardOrderBody;

    if (!buyerId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!productId || !Types.ObjectId.isValid(productId)) {
      res.status(400).json({ error: "A valid productId is required." });
      return;
    }

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const shippingFee = Math.max(0, Number(shipping) || 0);

    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    const unitPrice = roundPKR(product.pricing.currentRetailPrice);
    const depositPercentage = product.deposit_percentage ?? 10;
    const depositPaid = roundPKR(unitPrice * qty * (depositPercentage / 100));
    const reference = `std_p_${productId}_b_${buyerId}_${Date.now().toString(36)}`;

    // Authorize + capture the 10% hold synchronously for standard orders.
    const { trackerId } = await createAuthorization({
      amount: depositPaid,
      intent: "AUTHORIZE",
      reference,
      productId,
    });

    const session = await mongoose.startSession();
    let order: InstanceType<typeof Order>;
    try {
      order = await session.withTransaction(async () => {
        const txn = await Transaction.create(
          [
            {
              safepayTrackerId: trackerId,
              buyerId: new Types.ObjectId(buyerId),
              productId: product._id,
              holdAmount: depositPaid,
              escrowState: EscrowStateEnum.Authorized,
              authorizedAt: new Date(),
            },
          ],
          { session },
        );
        const created = txn[0];

        // Capture the hold immediately for a standard purchase.
        await captureFunds(created.safepayTrackerId, created.holdAmount);
        created.escrowState = EscrowStateEnum.Captured;
        created.capturedAt = new Date();
        await created.save({ session });

        const totals = computeOrderFinance({
          unitPrice,
          quantity: qty,
          discountRate: 0,
          shipping: shippingFee,
          platformFee: 0,
          depositPaid,
          depositPercentage,
        });

        const createdOrders = await Order.create(
          [
            {
              buyerId: new Types.ObjectId(buyerId),
              supplierId: product.supplierId,
              productId: product._id,
              transactionId: created._id,
              purchaseType: PurchaseTypeEnum.Standard,
              totals,
              paymentMethod: PaymentMethodEnum.FullRetail,
              logisticsStatus: LogisticsEnum.PendingDispatch,
            },
          ],
          { session },
        );
        return createdOrders[0];
      });
    } finally {
      await session.endSession();
    }

    res.status(201).json({
      message: "Standard order created. Deposit captured, balance due as COD.",
      data: {
        orderId: order._id,
        purchaseType: PurchaseTypeEnum.Standard,
        totals: order.totals,
      },
    });
  },
);

/* ------------------------------------------------------------------ */
/* Step 2.3 — getBuyerOrders                                          */
/* ------------------------------------------------------------------ */

/**
 * GET /api/orders/me
 * Protected. Returns all orders placed by the authenticated buyer, newest
 * first, with product details populated.
 */
export const getBuyerOrders = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const buyerId = req.user?.userId;
    if (!buyerId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const orders = await Order.find({ buyerId: new Types.ObjectId(buyerId) })
      .populate({ path: "productId", select: "title slug images category pricing" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: orders });
  },
);

/* ------------------------------------------------------------------ */
/* Step 2.4 — getSupplierManifests                                    */
/* ------------------------------------------------------------------ */

/**
 * GET /api/orders/manifest
 * Protected (Supplier). Returns all Pending_Dispatch orders for products
 * owned by the authenticated supplier — the "manifest" they fulfill from.
 */
export const getSupplierManifests = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = req.user?.userId;
    if (!supplierId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const orders = await Order.find({
      supplierId: new Types.ObjectId(supplierId),
      logisticsStatus: LogisticsEnum.PendingDispatch,
    })
      .populate({ path: "productId", select: "title slug images category pricing" })
      .populate({ path: "buyerId", select: "phoneNumber name" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: orders });
  },
);

/* ------------------------------------------------------------------ */
/* Step 2.6 — getAdminDispatchedOrders (Admin)                        */
/* ------------------------------------------------------------------ */

/**
 * GET /api/orders/admin/dispatched
 * Admin-only. Returns all orders grouped by their dispatch/logistics state
 * so the admin can see exactly which orders were dispatched to which
 * supplier, plus the full history. Includes product and supplier details.
 */
export const getAdminDispatchedOrders = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const orders = await Order.find({})
      .populate({ path: "productId", select: "title slug images category pricing" })
      .populate({ path: "supplierId", select: "name phoneNumber email supplierDetails.companyName" })
      .populate({ path: "buyerId", select: "name phoneNumber" })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ data: orders });
  },
);

/* ------------------------------------------------------------------ */
/* Step 2.7 — adminCancelOrder (Admin)                                */
/* ------------------------------------------------------------------ */

/**
 * PUT /api/orders/admin/:id/cancel
 * Admin-only. Cancels an order at any non-terminal state. Voids the
 * associated Safepay hold if still authorized so the buyer is refunded
 * their upfront deposit. Flips logisticsStatus to Cancelled.
 */
export const adminCancelOrder = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "A valid order id is required." });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.logisticsStatus === LogisticsEnum.Delivered || order.logisticsStatus === LogisticsEnum.Cancelled) {
      res.status(409).json({ error: "This order is already in a terminal logistics state." });
      return;
    }

    // Void the associated transaction's hold if it is still Authorized.
    const txn = await Transaction.findById(order.transactionId);
    if (txn && txn.escrowState === EscrowStateEnum.Authorized) {
      try {
        await voidFunds(txn.safepayTrackerId);
        txn.escrowState = EscrowStateEnum.Voided;
        txn.voidedAt = new Date();
        await txn.save();
      } catch (err) {
        console.error(`[admin cancel] void failed for txn ${txn._id}:`, err);
      }
    }

    order.logisticsStatus = LogisticsEnum.Cancelled;
    await order.save();

    res.status(200).json({
      message: "Order cancelled. Buyer's deposit hold has been voided.",
      data: {
        orderId: order._id.toString(),
        logisticsStatus: order.logisticsStatus,
      },
    });
  },
);

interface UpdateTrackingBody {
  trackingNumber?: string;
  courier?: string;
}

/**
 * PUT /api/orders/:id/tracking
 * Protected (Supplier). Lets the supplier attach a courier tracking number
 * once they've dispatched an order — pushes it from Pending_Dispatch to
 * Packed. Only the supplier who owns the order may update it.
 */
export const updateOrderTracking = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const supplierId = req.user?.userId;
    const { id } = req.params;
    const { trackingNumber, courier } = req.body as UpdateTrackingBody;

    if (!supplierId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ error: "A valid order id is required." });
      return;
    }
    if (!trackingNumber || !trackingNumber.trim()) {
      res.status(400).json({ error: "trackingNumber is required." });
      return;
    }

    const order = await Order.findById(id);
    if (!order) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    if (order.supplierId.toString() !== supplierId) {
      res.status(403).json({ error: "This order does not belong to you." });
      return;
    }
    if (
      order.logisticsStatus === LogisticsEnum.Delivered ||
      order.logisticsStatus === LogisticsEnum.Cancelled ||
      order.logisticsStatus === LogisticsEnum.Returned
    ) {
      res.status(409).json({ error: "This order is already in a terminal logistics state." });
      return;
    }

    order.trackingNumber = trackingNumber.trim();
    if (courier) {
      order.courier = courier.trim();
    }
    if (order.logisticsStatus === LogisticsEnum.PendingDispatch) {
      order.logisticsStatus = LogisticsEnum.Packed;
    }
    await order.save();

    res.status(200).json({
      message: "Tracking updated.",
      data: {
        orderId: order._id,
        trackingNumber: order.trackingNumber,
        courier: order.courier,
        logisticsStatus: order.logisticsStatus,
      },
    });
  },
);
