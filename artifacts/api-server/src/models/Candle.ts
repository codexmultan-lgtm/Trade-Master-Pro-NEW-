import mongoose, { Document, Schema } from "mongoose";

export interface ICandle extends Document {
  symbol: string;
  interval: string;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const CandleSchema = new Schema<ICandle>({
  symbol: { type: String, required: true },
  interval: { type: String, required: true, default: "1m" },
  time: { type: Number, required: true },
  open: { type: Number, required: true },
  high: { type: Number, required: true },
  low: { type: Number, required: true },
  close: { type: Number, required: true },
  volume: { type: Number, required: true },
});

CandleSchema.index({ symbol: 1, interval: 1, time: -1 });

export const Candle = mongoose.model<ICandle>("Candle", CandleSchema);
