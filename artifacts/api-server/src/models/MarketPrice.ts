import mongoose, { Document, Schema } from "mongoose";

export interface IMarketPrice extends Document {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  lastPrice: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  updatedAt: Date;
}

const MarketPriceSchema = new Schema<IMarketPrice>(
  {
    symbol: { type: String, required: true, unique: true },
    baseAsset: { type: String, required: true },
    quoteAsset: { type: String, required: true },
    lastPrice: { type: Number, required: true },
    change24h: { type: Number, default: 0 },
    high24h: { type: Number, required: true },
    low24h: { type: Number, required: true },
    volume24h: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const MarketPrice = mongoose.model<IMarketPrice>("MarketPrice", MarketPriceSchema);
