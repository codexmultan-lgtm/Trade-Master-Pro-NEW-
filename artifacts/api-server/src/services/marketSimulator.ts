import { MarketPrice } from "../models/MarketPrice.js";
import { Candle } from "../models/Candle.js";
import { Server as SocketServer } from "socket.io";
import { logger } from "../lib/logger.js";

const INITIAL_PRICES: Record<string, { price: number; base: string; quote: string }> = {
  BTCUSDT: { price: 67450, base: "BTC", quote: "USDT" },
  BTCINR:  { price: 5621000, base: "BTC", quote: "INR" },
  ETHUSDT: { price: 3520, base: "ETH", quote: "USDT" },
  ETHINR:  { price: 293200, base: "ETH", quote: "INR" },
  BNBUSDT: { price: 612, base: "BNB", quote: "USDT" },
};

const VOLATILITY: Record<string, number> = {
  BTCUSDT: 0.0008,
  BTCINR:  0.0008,
  ETHUSDT: 0.0010,
  ETHINR:  0.0010,
  BNBUSDT: 0.0012,
};

const currentPrices: Record<string, number> = {};
let io: SocketServer | null = null;

export function setSocketIO(socketIO: SocketServer): void {
  io = socketIO;
}

function randomWalk(price: number, volatility: number): number {
  const drift = (Math.random() - 0.49) * 2 * volatility;
  return price * (1 + drift);
}

export async function initMarkets(): Promise<void> {
  for (const [symbol, data] of Object.entries(INITIAL_PRICES)) {
    const existing = await MarketPrice.findOne({ symbol });
    if (!existing) {
      await MarketPrice.create({
        symbol,
        baseAsset: data.base,
        quoteAsset: data.quote,
        lastPrice: data.price,
        change24h: (Math.random() - 0.5) * 6,
        high24h: data.price * 1.02,
        low24h: data.price * 0.98,
        volume24h: Math.random() * 1000000000,
      });
    }
    const market = await MarketPrice.findOne({ symbol });
    currentPrices[symbol] = market?.lastPrice ?? data.price;
  }

  // Seed last 100 candles per symbol
  for (const symbol of Object.keys(INITIAL_PRICES)) {
    const existingCount = await Candle.countDocuments({ symbol, interval: "1m" });
    if (existingCount < 10) {
      const now = Math.floor(Date.now() / 60000) * 60;
      let price = currentPrices[symbol];
      const vol = VOLATILITY[symbol] ?? 0.001;
      const candles = [];
      for (let i = 99; i >= 0; i--) {
        const t = now - i * 60;
        const open = price;
        const close = randomWalk(price, vol * 3);
        const high = Math.max(open, close) * (1 + Math.random() * vol);
        const low = Math.min(open, close) * (1 - Math.random() * vol);
        candles.push({ symbol, interval: "1m", time: t, open, high, low, close, volume: Math.random() * 50 });
        price = close;
      }
      await Candle.insertMany(candles);
    }
  }
  logger.info("Markets initialized");
}

export async function tickMarkets(): Promise<void> {
  const now = Math.floor(Date.now() / 60000) * 60;

  for (const symbol of Object.keys(INITIAL_PRICES)) {
    const vol = VOLATILITY[symbol] ?? 0.001;
    const prevPrice = currentPrices[symbol];
    const newPrice = randomWalk(prevPrice, vol);
    currentPrices[symbol] = newPrice;

    // Update market document
    await MarketPrice.findOneAndUpdate(
      { symbol },
      {
        lastPrice: newPrice,
        $max: { high24h: newPrice },
        $min: { low24h: newPrice },
        $inc: { volume24h: Math.random() * 1000 },
      }
    );

    // Upsert current candle
    const lastCandle = await Candle.findOne({ symbol, interval: "1m", time: now });
    if (!lastCandle) {
      await Candle.create({
        symbol,
        interval: "1m",
        time: now,
        open: prevPrice,
        high: Math.max(prevPrice, newPrice),
        low: Math.min(prevPrice, newPrice),
        close: newPrice,
        volume: Math.random() * 10,
      });
    } else {
      lastCandle.close = newPrice;
      lastCandle.high = Math.max(lastCandle.high, newPrice);
      lastCandle.low = Math.min(lastCandle.low, newPrice);
      lastCandle.volume += Math.random() * 5;
      await lastCandle.save();
    }

    // Emit to socket clients
    if (io) {
      const market = await MarketPrice.findOne({ symbol });
      io.emit("price_update", {
        symbol,
        price: newPrice,
        change24h: market?.change24h ?? 0,
      });
      const candle = await Candle.findOne({ symbol, interval: "1m", time: now });
      if (candle) {
        io.emit("candle_update", {
          symbol,
          candle: { time: candle.time, open: candle.open, high: candle.high, low: candle.low, close: candle.close, volume: candle.volume },
        });
      }
    }
  }
}

export function getCurrentPrice(symbol: string): number {
  return currentPrices[symbol] ?? 0;
}
