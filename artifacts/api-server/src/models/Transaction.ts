import mongoose, { Document, Schema } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "deposit" | "withdrawal" | "trade_win" | "trade_loss" | "adjustment";
  amount: number;
  status: "pending" | "approved" | "rejected";
  method?: string;
  proofUrl?: string;
  accountDetails?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "trade_win", "trade_loss", "adjustment"],
      required: true,
    },
    amount: { type: Number, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    method: { type: String },
    proofUrl: { type: String },
    accountDetails: { type: String },
    notes: { type: String },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ status: 1, type: 1 });

export const Transaction = mongoose.model<ITransaction>("Transaction", TransactionSchema);
