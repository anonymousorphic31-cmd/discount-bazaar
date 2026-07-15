import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import {
  type ProductApprovalStatus,
  ProductApprovalStatus as ApprovalStatusEnum,
} from "../types/enums.js";

/* ------------------------------------------------------------------ */
/* Pricing                                                            */
/* ------------------------------------------------------------------ */

export interface IProductPricing {
  marketAnchorPrice: number; // retail anchor (PKR)
  baseWholesaleCost: number; // supplier cost (PKR)
  maxSquadDiscount: number; // 0–1 fraction of anchor price
  currentRetailPrice: number; // dynamic retail shown on PDP
}

const ProductPricingSchema = new Schema<IProductPricing>(
  {
    marketAnchorPrice: { type: Number, required: true, min: 0 },
    baseWholesaleCost: { type: Number, required: true, min: 0 },
    maxSquadDiscount: { type: Number, required: true, min: 0, max: 1, default: 0.3 },
    currentRetailPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

/* ------------------------------------------------------------------ */
/* Product                                                            */
/* ------------------------------------------------------------------ */

export interface IProduct extends Document {
  title: string;
  slug: string;
  description: string;
  images: Types.Array<string>;
  category: string;
  supplierId: Types.ObjectId;
  pricing: IProductPricing;
  dualCheckoutEnabled: boolean;
  maxSquadMembers: number; // per project spec, target squad size
  isActive: boolean;
  // Approved products are admin-uploaded (bypasses review) or supplier
  // proposals that have cleared the admin Proposal Queue. Pending proposals
  // are never active/visible on the storefront until approved.
  approvalStatus: ProductApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    title: { type: String, required: true, trim: true, index: "text" },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    category: { type: String, required: true, index: true, trim: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    pricing: { type: ProductPricingSchema, required: true },
    dualCheckoutEnabled: { type: Boolean, default: true, required: true },
    maxSquadMembers: { type: Number, required: true, min: 1, default: 30 },
    isActive: { type: Boolean, default: true, index: true },
    approvalStatus: {
      type: String,
      enum: Object.values(ApprovalStatusEnum),
      default: ApprovalStatusEnum.Approved,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

export const Product: Model<IProduct> = mongoose.model<IProduct>("Product", ProductSchema);
export default Product;
