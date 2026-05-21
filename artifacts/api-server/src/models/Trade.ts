import mongoose, { Document, Schema } from "mongoose";

export interface ITrade extends Document {
  userId: mongoose.Types.ObjectId;
  symbol: string;
  direction: "up" | "down";
  amount: number;
  duration: 60 | 120 | 180 | 240;
  profitPercent: number;
  entryPrice: number;
  exitPrice?: number;
  profitLoss?: number;
  status: "active" | "win" | "loss" | "cancelled";
  expiresAt: Date;
  settledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TradeSchema = new Schema<ITrade>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    symbol: { type: String, required: true },
    direction: { type: String, enum: ["up", "down"], required: true },
    amount: { type: Number, required: true },
    duration: { type: Number, enum: [60, 120, 180, 240], required: true },
    profitPercent: { type: Number, required: true },
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number },
    profitLoss: { type: Number },
    status: { type: String, enum: ["active", "win", "loss", "cancelled"], default: "active" },
    expiresAt: { type: Date, required: true },
    settledAt: { type: Date },
  },
  { timestamps: true }
);

TradeSchema.index({ userId: 1, status: 1 });
TradeSchema.index({ status: 1, expiresAt: 1 });

export const Trade = mongoose.model<ITrade>("Trade", TradeSchema);
