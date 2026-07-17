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
  stockAvailable?: number; // default stock count editable by supplier
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
    stockAvailable: { type: Number, default: 0, min: 0 },
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

export interface IContactVerification {
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface IBusinessInfo {
  businessName?: string;
  website?: string;
  dropshipNetworkId?: string;
}

export interface ILegalDocs {
  ownerName?: string;
  cnicNumber?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  ntnNumber?: string;
  ntnDocUrl?: string;
}

export interface IBankDetails {
  accountTitle?: string;
  iban?: string;
  bankCertUrl?: string;
}

export interface IUser extends Document {
  email?: string;
  phoneNumber: string; // E.164, unique
  role: UserRole;
  name: string;
  businessName?: string;
  dropshipNetworkId?: string;
  contactNumber?: string;
  cnicNtn?: string;
  verificationStatus: "Unverified" | "Pending" | "Needs_Correction" | "Verified" | "Rejected";
  adminFeedback?: string;
  contactVerification?: IContactVerification;
  businessInfo?: IBusinessInfo;
  legalDocs?: ILegalDocs;
  bankDetails?: IBankDetails;
  businessProofUrls?: string[];
  passwordHash?: string;
  passwordSalt?: string;
  whatsappOtp?: string;
  emailOtp?: string;
  otpExpiresAt?: Date;
  supplierDetails?: ISupplierDetails;
  shippingAddress?: IShippingAddress;
  isSuspended?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ContactVerificationSchema = new Schema<IContactVerification>(
  {
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
  },
  { _id: false, timestamps: false },
);

const BusinessInfoSchema = new Schema<IBusinessInfo>(
  {
    businessName: { type: String, trim: true },
    website: { type: String, trim: true },
    dropshipNetworkId: { type: String, trim: true },
  },
  { _id: false, timestamps: false },
);

const LegalDocsSchema = new Schema<ILegalDocs>(
  {
    ownerName: { type: String, trim: true },
    cnicNumber: { type: String, trim: true },
    cnicFrontUrl: { type: String, trim: true },
    cnicBackUrl: { type: String, trim: true },
    ntnNumber: { type: String, trim: true },
    ntnDocUrl: { type: String, trim: true },
  },
  { _id: false, timestamps: false },
);

const BankDetailsSchema = new Schema<IBankDetails>(
  {
    accountTitle: { type: String, trim: true },
    iban: { type: String, trim: true, uppercase: true },
    bankCertUrl: { type: String, trim: true },
  },
  { _id: false, timestamps: false },
);

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
      enum: ["Unverified", "Pending", "Needs_Correction", "Verified", "Rejected"],
      default: "Unverified",
      index: true,
    },
    adminFeedback: { type: String, trim: true },
    contactVerification: { type: ContactVerificationSchema, default: { emailVerified: false, phoneVerified: false } },
    businessInfo: { type: BusinessInfoSchema, default: {} },
    legalDocs: { type: LegalDocsSchema, default: {} },
    bankDetails: { type: BankDetailsSchema, default: {} },
    businessProofUrls: { type: [String], default: [] },
    passwordHash: { type: String, select: false },
    passwordSalt: { type: String, select: false },
    // Transient — never returned to clients.
    whatsappOtp: { type: String, select: false },
    emailOtp: { type: String, select: false },
    otpExpiresAt: { type: Date, select: false },
    supplierDetails: {
      type: SupplierDetailsSchema,
      required: function (this: IUser): boolean {
        return this.role === UserRoleEnum.Supplier;
      },
    },
    shippingAddress: { type: ShippingAddressSchema, default: null },
    isSuspended: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const User: Model<IUser> = mongoose.model<IUser>("User", UserSchema);
export default User;
