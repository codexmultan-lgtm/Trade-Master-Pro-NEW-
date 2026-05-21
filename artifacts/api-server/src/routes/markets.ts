import { Router } from "express";
import type { Response, Request } from "express";
import { MarketPrice } from "../models/MarketPrice.js";
import { Candle } from "../models/Candle.js";
import { getCurrentPrice } from "../services/marketSimulator.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const markets = await MarketPrice.find({}).sort({ symbol: 1 });
  res.json(markets.map((m) => ({
    symbol: m.symbol,
    baseAsset: m.baseAsset,
    quoteAsset: m.quoteAsset,
    lastPrice: m.lastPrice,
    change24h: m.change24h,
    high24h: m.high24h,
    low24h: m.low24h,
    volume24h: m.volume24h,
  })));
});

router.get("/:symbol/candles", async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const interval = (req.query.interval as string) || "1m";
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);

  const candles = await Candle.find({ symbol, interval })
    .sort({ time: -1 })
    .limit(limit);

  res.json(candles.reverse().map((c) => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
  })));
});

router.get("/:symbol/price", async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const market = await MarketPrice.findOne({ symbol });
  if (!market) { res.status(404).json({ error: "Symbol not found" }); return; }
  res.json({
    symbol,
    price: getCurrentPrice(symbol) || market.lastPrice,
    change24h: market.change24h,
    timestamp: Math.floor(Date.now() / 1000),
  });
});

export default router;
