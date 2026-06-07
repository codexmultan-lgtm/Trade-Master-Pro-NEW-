import mongoose, { Document, Schema } from "mongoose";

export interface IPlatformSettings extends Document {
  currency: "PKR" | "USD" | "INR" | "GBP";
  currencySymbol: string;
  profit60s: number;
  profit120s: number;
  profit180s: number;
  profit240s: number;
  lossPercent: number;
  minTradeAmount: number;
  maxTradeAmount: number;
  enabledSymbols: string[];
}

const PlatformSettingsSchema = new Schema<IPlatformSettings>(
  {
    currency:         { type: String, enum: ["PKR", "USD", "INR", "GBP"], default: "PKR" },
    currencySymbol:   { type: String, default: "₨" },
    profit60s:        { type: Number, default: 85 },
    profit120s:       { type: Number, default: 80 },
    profit180s:       { type: Number, default: 75 },
    profit240s:       { type: Number, default: 70 },
    lossPercent:      { type: Number, default: 100 },
    minTradeAmount:   { type: Number, default: 100 },
    maxTradeAmount:   { type: Number, default: 100000 },
    enabledSymbols:   {
      type: [String],
      default: ["BTCUSDT","BTCPKR","BTCINR","ETHUSDT","ETHPKR","ETHINR","BNBUSDT","BNBPKR","USDTPKR","USDTINR","BTSPKR","BTSINR"],
    },
  },
  { timestamps: true }
);

export async function getOrCreateSettings(): Promise<IPlatformSettings> {
  let s = await PlatformSettings.findOne({});
  if (!s) s = await PlatformSettings.create({});
  return s;
}

export function formatSettings(s: IPlatformSettings) {
  return {
    currency:        s.currency,
    currencySymbol:  s.currencySymbol,
    profit60s:       s.profit60s,
    profit120s:      s.profit120s,
    profit180s:      s.profit180s,
    profit240s:      s.profit240s,
    lossPercent:     s.lossPercent,
    minTradeAmount:  s.minTradeAmount,
    maxTradeAmount:  s.maxTradeAmount,
    enabledSymbols:  s.enabledSymbols,
  };
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "₨", USD: "$", INR: "₹", GBP: "£",
};

export const PlatformSettings = mongoose.model<IPlatformSettings>("PlatformSettings", PlatformSettingsSchema);
