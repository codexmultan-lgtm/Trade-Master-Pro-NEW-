import { Router } from "express";
import type { Response } from "express";
import { authMiddleware, checkFrozen, AuthRequest } from "../middlewares/auth.js";
import { User } from "../models/User.js";
import { Trade } from "../models/Trade.js";
import { getCurrentPrice } from "../services/marketSimulator.js";

const router = Router();
router.use(authMiddleware);

const PROFIT_PERCENTAGES: Record<number, number> = { 60: 85, 120: 80, 180: 75, 240: 70 };
const VALID_SYMBOLS = ["BTCUSDT", "BTCINR", "ETHUSDT", "ETHINR", "BNBUSDT"];

function formatTrade(trade: InstanceType<typeof Trade>, user?: { email?: string; name?: string }) {
  return {
    id: trade._id.toString(),
    userId: trade.userId.toString(),
    userEmail: user?.email ?? null,
    userName: user?.name ?? null,
    symbol: trade.symbol,
    direction: trade.direction,
    amount: trade.amount,
    duration: trade.duration,
    profitPercent: trade.profitPercent,
    entryPrice: trade.entryPrice,
    exitPrice: trade.exitPrice ?? null,
    profitLoss: trade.profitLoss ?? null,
    status: trade.status,
    expiresAt: trade.expiresAt,
    settledAt: trade.settledAt ?? null,
    createdAt: trade.createdAt,
  };
}

router.post("/", checkFrozen, async (req: AuthRequest, res: Response) => {
  const { symbol, direction, amount, duration } = req.body;
  if (!symbol || !direction || !amount || !duration) {
    res.status(400).json({ error: "symbol, direction, amount, duration required" });
    return;
  }
  if (!VALID_SYMBOLS.includes(symbol)) {
    res.status(400).json({ error: "Invalid symbol" });
    return;
  }
  if (!["up", "down"].includes(direction)) {
    res.status(400).json({ error: "direction must be up or down" });
    return;
  }
  if (![60, 120, 180, 240].includes(Number(duration))) {
    res.status(400).json({ error: "duration must be 60, 120, 180, or 240" });
    return;
  }
  if (amount <= 0) {
    res.status(400).json({ error: "amount must be positive" });
    return;
  }

  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.balance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  const entryPrice = getCurrentPrice(symbol);
  if (!entryPrice) {
    res.status(500).json({ error: "Market data unavailable" });
    return;
  }

  const profitPercent = PROFIT_PERCENTAGES[Number(duration)] ?? 80;
  const expiresAt = new Date(Date.now() + Number(duration) * 1000);

  user.balance -= amount;
  await user.save();

  const trade = await Trade.create({
    userId: req.userId,
    symbol,
    direction,
    amount,
    duration: Number(duration),
    profitPercent,
    entryPrice,
    expiresAt,
    status: "active",
  });

  res.status(201).json(formatTrade(trade));
});

router.get("/active", async (req: AuthRequest, res: Response) => {
  const trades = await Trade.find({ userId: req.userId, status: "active" }).sort({ createdAt: -1 });
  res.json(trades.map((t) => formatTrade(t)));
});

router.get("/history", async (req: AuthRequest, res: Response) => {
  const { symbol, limit = "20", page = "1" } = req.query as Record<string, string>;
  const query: Record<string, unknown> = { userId: req.userId, status: { $ne: "active" } };
  if (symbol) query.symbol = symbol;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pg - 1) * lim;

  const [trades, total] = await Promise.all([
    Trade.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim),
    Trade.countDocuments(query),
  ]);

  res.json({ trades: trades.map((t) => formatTrade(t)), total, page: pg, limit: lim });
});

router.get("/stats", async (req: AuthRequest, res: Response) => {
  const trades = await Trade.find({ userId: req.userId, status: { $ne: "active" } });
  const wins = trades.filter((t) => t.status === "win");
  const losses = trades.filter((t) => t.status === "loss");
  const totalProfit = wins.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0);
  const totalLoss = losses.reduce((sum, t) => sum + (t.amount), 0);
  const totalVolume = trades.reduce((sum, t) => sum + t.amount, 0);
  const profits = trades.map((t) => t.profitLoss ?? 0);

  res.json({
    totalTrades: trades.length,
    totalWins: wins.length,
    totalLosses: losses.length,
    winRate: trades.length ? (wins.length / trades.length) * 100 : 0,
    totalProfit,
    totalLoss,
    netPnl: totalProfit - totalLoss,
    totalVolume,
    bestTrade: profits.length ? Math.max(...profits) : null,
    worstTrade: profits.length ? Math.min(...profits) : null,
  });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const trade = await Trade.findOne({ _id: req.params.id, userId: req.userId });
  if (!trade) { res.status(404).json({ error: "Trade not found" }); return; }
  res.json(formatTrade(trade));
});

export { formatTrade };
export default router;
