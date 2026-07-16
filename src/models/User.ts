import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { type UserRole, UserRole as UserRoleEnum } from "../types/enums.js";

/* ------------------------------------------------------------------ */
/* Embedded supplier details                                          */
/* ------------------------------------------------------------------ */

export interface ISupplierDetails {
  companyName: string;
  ntn?: string; // National Tax Number (Pakistan)
  contactPerson: string;
  bankAccountTitle?: string;
  bankIban?: string;
  rating: number; // 0–5, maintained by admin QC
  isActive: boolean;
  catalogs: Types.Array<Types.ObjectId>; // product refs the supplier owns
}

const SupplierDetailsSchema = new Schema<ISupplierDetails>(
  {
    companyName: { type: String, required: true, trim: true },
    ntn: { type: String, trim: true, uppercase: true },
    contactPerson: { type: String, required: true, trim: true },
    bankAccountTitle: { type: String, trim: true },
    bankIban: { type: String, trim: true, uppercase: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    isActive: { type: Boolean, default: true },
    catalogs: { type: [Schema.Types.ObjectId], default: [] },
  },
  { _id: false, timestamps: false },
);

/* ------------------------------------------------------------------ */
/* Embedded shipping address                                          */
/* ------------------------------------------------------------------ */

export interface IShippingAddress {
  fullName: string;
  phoneNumber: string;
  province: string;
  city: string;
  area: string;
  streetAddress: string;
  landmark?: string;
}

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    landmark: { type: String, trim: true },
  },
  { _id: false, timestamps: false },
);

/* ------------------------------------------------------------------ */
/* User                                                               */
/* ------------------------------------------------------------------ */

export interface IUser extends Document {
  email?: string;
  phoneNumber: string; // E.164, unique
  role: UserRole;
  name: string;
  businessName?: string;
  dropshipNetworkId?: string;
  contactNumber?: string;
  cnicNtn?: string;
  verificationStatus: "Unverified" | "Pending" | "Approved" | "Rejected";
  reviewNote?: string;
  businessProofUrls?: string[];
  passwordHash?: string;
  passwordSalt?: string;
  whatsappOtp?: string;
  otpExpiresAt?: Date;
  supplierDetails?: ISupplierDetails;
  shippingAddress?: IShippingAddress;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRoleEnum),
      default: UserRoleEnum.Buyer,
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    businessName: { type: String, trim: true },
    dropshipNetworkId: { type: String, trim: true },
    contactNumber: { type: String, trim: true },
    cnicNtn: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ["Unverified", "Pending", "Approved", "Rejected"],
      default: "Approved",
      index: true,
    },
    businessProofUrls: { type: [String], default: [] },
    reviewNote: { type: String, trim: true },
    passwordHash: { type: String, select: false },
    passwordSalt: { type: String, select: false },
    // Transient — never returned to clients.
    whatsappOtp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    supplierDetails: {
      type: SupplierDetailsSchema,
      required: function (this: IUser): boolean {
        return this.role === UserRoleEnum.Supplier;
      },
    },
    shippingAddress: { type: ShippingAddressSchema, default: null },
  },
  { timestamps: true },
);

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
