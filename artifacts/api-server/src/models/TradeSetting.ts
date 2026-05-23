import mongoose, { Document, Schema } from "mongoose";

export interface ITradeSetting extends Document {
  symbol: string;
  outcome: "auto" | "win" | "loss";
}

const TradeSettingSchema = new Schema<ITradeSetting>(
  {
    symbol: { type: String, required: true, unique: true },
    outcome: { type: String, enum: ["auto", "win", "loss"], default: "auto" },
  },
  { timestamps: true }
);

export const TradeSetting = mongoose.model<ITradeSetting>("TradeSetting", TradeSettingSchema);
