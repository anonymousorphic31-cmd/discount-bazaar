import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";
import { type EscrowState, EscrowState as EscrowStateEnum } from "../types/enums.js";

export interface ITransaction extends Document {
  safepayTrackerId: string; // returned by Safepay at authorization
  buyerId: Types.ObjectId;
  squadId?: Types.ObjectId; // present for squad-deposit flows
  productId: Types.ObjectId;
  holdAmount: number; // PKR, the 10% pre-auth (never settled into wallet)
  escrowState: EscrowState;
  authorizedAt?: Date;
  capturedAt?: Date;
  voidedAt?: Date;
  buyerVote?: "Proceed" | "OptOut";
  webhookEvents: Types.Array<{
    event: string;
    receivedAt: Date;
    rawPayload?: Record<string, unknown>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    safepayTrackerId: { type: String, required: true, unique: true, index: true, trim: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    squadId: { type: Schema.Types.ObjectId, ref: "Squad", index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    holdAmount: { type: Number, required: true, min: 0 },
    escrowState: {
      type: String,
      enum: Object.values(EscrowStateEnum),
      default: EscrowStateEnum.Authorized,
      required: true,
      index: true,
    },
    authorizedAt: { type: Date },
    capturedAt: { type: Date },
    voidedAt: { type: Date },
    buyerVote: { type: String, enum: ["Proceed", "OptOut"] },
    webhookEvents: {
      type: [
        {
          event: { type: String, required: true },
          receivedAt: { type: Date, default: Date.now, required: true },
          rawPayload: { type: Schema.Types.Mixed },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const Transaction: Model<ITransaction> =
  mongoose.model<ITransaction>("Transaction", TransactionSchema);
export default Transaction;
