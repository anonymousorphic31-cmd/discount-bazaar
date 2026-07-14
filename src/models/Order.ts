import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import {
  type OrderLogisticsStatus,
  OrderLogisticsStatus as LogisticsEnum,
  type PaymentMethod,
  PaymentMethod as PaymentMethodEnum,
} from "../types/enums.js";

/* ------------------------------------------------------------------ */
/* Locked financial snapshot                                          */
/* ------------------------------------------------------------------ */

export interface IOrderTotals {
  unitPrice: number; // PKR, price locked at purchase
  quantity: number;
  discountRate: number; // 0–1
  discountAmount: number; // PKR
  subtotal: number; // unitPrice * quantity - discountAmount
  shipping: number;
  platformFee: number;
  supplierPayout: number; // what the supplier receives post-capture
  total: number; // charged to buyer
}

const OrderTotalsSchema = new Schema<IOrderTotals>(
  {
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    discountRate: { type: Number, required: true, min: 0, max: 1 },
    discountAmount: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, default: 0, min: 0 },
    platformFee: { type: Number, required: true, default: 0, min: 0 },
    supplierPayout: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/* Order                                                              */
/* ------------------------------------------------------------------ */

export interface IOrder extends Document {
  buyerId: Types.ObjectId;
  supplierId: Types.ObjectId;
  productId: Types.ObjectId;
  squadId?: Types.ObjectId;
  transactionId: Types.ObjectId; // the captured Safepay transaction
  totals: IOrderTotals;
  paymentMethod: PaymentMethod;
  logisticsStatus: OrderLogisticsStatus;
  trackingNumber?: string;
  courier?: string;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    squadId: { type: Schema.Types.ObjectId, ref: "Squad", index: true },
    transactionId: {
      type: Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
    },
    totals: { type: OrderTotalsSchema, required: true },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethodEnum),
      default: PaymentMethodEnum.FullRetail,
      required: true,
    },
    logisticsStatus: {
      type: String,
      enum: Object.values(LogisticsEnum),
      default: LogisticsEnum.Pending,
      required: true,
      index: true,
    },
    trackingNumber: { type: String, trim: true },
    courier: { type: String, trim: true },
    deliveredAt: { type: Date },
  },
  { timestamps: true },
);

export const Order: Model<IOrder> = mongoose.model<IOrder>("Order", OrderSchema);
export default Order;
