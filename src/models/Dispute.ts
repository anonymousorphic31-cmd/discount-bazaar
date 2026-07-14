import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import {
  type DisputeIssueType,
  DisputeIssueType as IssueTypeEnum,
  type DisputeStatus,
  DisputeStatus as DisputeStatusEnum,
} from "../types/enums.js";

export interface IDisputeMessage {
  authorRole: "Buyer" | "Supplier" | "Admin";
  authorId: Types.ObjectId;
  body: string;
  attachments: Types.Array<string>;
  postedAt: Date;
}

const DisputeMessageSchema = new Schema<IDisputeMessage>(
  {
    authorRole: { type: String, enum: ["Buyer", "Supplier", "Admin"], required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true },
    attachments: { type: [String], default: [] },
    postedAt: { type: Date, default: Date.now, required: true },
  },
  { _id: false },
);

export interface IDispute extends Document {
  orderId: Types.ObjectId;
  buyerId: Types.ObjectId;
  supplierId: Types.ObjectId;
  issueType: DisputeIssueType;
  status: DisputeStatus;
  description: string;
  evidenceUrls: Types.Array<string>;
  resolutionNote?: string;
  resolvedBy?: Types.ObjectId; // admin user id
  resolvedAt?: Date;
  messages: Types.DocumentArray<IDisputeMessage>;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    issueType: {
      type: String,
      enum: Object.values(IssueTypeEnum),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(DisputeStatusEnum),
      default: DisputeStatusEnum.Open,
      required: true,
      index: true,
    },
    description: { type: String, required: true },
    evidenceUrls: { type: [String], default: [] },
    resolutionNote: { type: String },
    resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    resolvedAt: { type: Date },
    messages: { type: [DisputeMessageSchema], default: [] },
  },
  { timestamps: true },
);

export const Dispute: Model<IDispute> = mongoose.model<IDispute>("Dispute", DisputeSchema);
export default Dispute;
