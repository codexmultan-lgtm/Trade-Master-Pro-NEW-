import { Router } from "express";
import type { Response } from "express";
import { authMiddleware, adminMiddleware, AuthRequest } from "../middlewares/auth.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Trade } from "../models/Trade.js";
import { Notification } from "../models/Notification.js";
import { TradeSetting } from "../models/TradeSetting.js";
import { PlatformSettings, getOrCreateSettings, formatSettings, CURRENCY_SYMBOLS } from "../models/PlatformSettings.js";
import {
  GetAdminWithdrawalAccountParams,
  GetAdminWithdrawalAccountResponse,
  UpdateAdminWithdrawalAccountParams,
  UpdateAdminWithdrawalAccountBody,
  UpdateAdminWithdrawalAccountResponse,
} from "@workspace/api-zod";

const router = Router();
router.use(authMiddleware, adminMiddleware);

function formatUser(user: InstanceType<typeof User>) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    status: user.status,
    balance: user.balance,
    totalDeposited: user.totalDeposited,
    totalWithdrawn: user.totalWithdrawn,
    totalProfit: user.totalProfit,
    totalLoss: user.totalLoss,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
    withdrawalBanned: user.withdrawalBanned ?? false,
    withdrawalBanReason: user.withdrawalBanReason ?? null,
    tradeBanned: user.tradeBanned ?? false,
    tradeBanReason: user.tradeBanReason ?? null,
    frozenReason: user.frozenReason ?? null,
    profileHealth: user.profileHealth ?? 100,
  };
}

function formatTx(tx: InstanceType<typeof Transaction>, user?: { email?: string; name?: string }) {
  return {
    id: tx._id.toString(),
    userId: tx.userId.toString(),
    userEmail: user?.email ?? null,
    userName: user?.name ?? null,
    type: tx.type,
    amount: tx.amount,
    status: tx.status,
    method: tx.method ?? null,
    proofUrl: tx.proofUrl ?? null,
    accountDetails: tx.accountDetails ?? null,
    notes: tx.notes ?? null,
    rejectionReason: tx.rejectionReason ?? null,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

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

// ─── STATS ───────────────────────────────────────────────────
router.get("/stats", async (_req: AuthRequest, res: Response) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalUsers, activeUsers, frozenUsers,
    totalTrades, pendingDeposits, pendingWithdrawals,
    todayTrades, todaySignups,
    depositAgg, withdrawalAgg, tradeWinAgg, tradeLossAgg,
  ] = await Promise.all([
    User.countDocuments({ role: "user" }),
    User.countDocuments({ role: "user", status: "active" }),
    User.countDocuments({ role: "user", status: "frozen" }),
    Trade.countDocuments({}),
    Transaction.countDocuments({ type: "deposit", status: "pending" }),
    Transaction.countDocuments({ type: "withdrawal", status: "pending" }),
    Trade.countDocuments({ createdAt: { $gte: today } }),
    User.countDocuments({ createdAt: { $gte: today } }),
    Transaction.aggregate([{ $match: { type: "deposit", status: "approved" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "withdrawal", status: "approved" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "trade_win" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Transaction.aggregate([{ $match: { type: "trade_loss" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
  ]);

  const totalDeposited = depositAgg[0]?.total ?? 0;
  const totalWithdrawn = withdrawalAgg[0]?.total ?? 0;
  const userPayouts = tradeWinAgg[0]?.total ?? 0;
  const userLosses = tradeLossAgg[0]?.total ?? 0;
  const platformPnl = userLosses - userPayouts;

  const todayTradesAgg = await Trade.aggregate([
    { $match: { createdAt: { $gte: today } } },
    { $group: { _id: null, volume: { $sum: "$amount" } } }
  ]);

  res.json({
    totalUsers,
    activeUsers,
    frozenUsers,
    totalDeposited,
    totalWithdrawn,
    totalTrades,
    pendingDeposits,
    pendingWithdrawals,
    platformPnl,
    todayTrades,
    todaySignups,
    todayVolume: todayTradesAgg[0]?.volume ?? 0,
  });
});

// ─── USERS ────────────────────────────────────────────────────
router.get("/users", async (req: AuthRequest, res: Response) => {
  const { search, status, limit = "20", page = "1" } = req.query as Record<string, string>;
  const query: Record<string, unknown> = {};
  if (search) query.$or = [
    { name: { $regex: search, $options: "i" } },
    { email: { $regex: search, $options: "i" } },
  ];
  if (status) query.status = status;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pg - 1) * lim;

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim),
    User.countDocuments(query),
  ]);

  res.json({ users: users.map(formatUser), total, page: pg, limit: lim });
});

router.get("/users/:id", async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const [recentTrades, recentTransactions] = await Promise.all([
    Trade.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
    Transaction.find({ userId: user._id }).sort({ createdAt: -1 }).limit(10),
  ]);
  res.json({
    user: formatUser(user),
    recentTrades: recentTrades.map((t) => formatTrade(t, { email: user.email, name: user.name })),
    recentTransactions: recentTransactions.map((tx) => formatTx(tx, { email: user.email, name: user.name })),
  });
});

router.get("/users/:id/withdrawal-account", async (req: AuthRequest, res: Response): Promise<void> => {
  const params = GetAdminWithdrawalAccountParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid user ID" });
    return;
  }
  const user = await User.findById(params.data.id).select("withdrawalAccount");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(GetAdminWithdrawalAccountResponse.parse(user.withdrawalAccount ?? null));
});

router.patch("/users/:id/withdrawal-account", async (req: AuthRequest, res: Response): Promise<void> => {
  const params = UpdateAdminWithdrawalAccountParams.safeParse(req.params);
  const body = UpdateAdminWithdrawalAccountBody.strict().safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "A valid user ID and account number (1–128 characters) are required" });
    return;
  }
  const user = await User.findById(params.data.id).select("withdrawalAccount");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!user.withdrawalAccount) {
    res.status(400).json({ error: "The user has not saved a withdrawal account" });
    return;
  }
  if (user.withdrawalAccount.currency === "USDT") {
    res.status(400).json({ error: "USDT uses a wallet address, not an account number" });
    return;
  }
  // Change only the saved number, never balances, other details, or transaction snapshots.
  // Matching the original account also prevents overwriting a concurrent user edit.
  const updated = await User.findOneAndUpdate(
    { _id: user._id, withdrawalAccount: user.withdrawalAccount },
    { $set: { "withdrawalAccount.accountNumber": body.data.accountNumber.trim() } },
    { new: true, runValidators: true },
  ).select("withdrawalAccount");
  if (!updated) {
    res.status(409).json({ error: "The saved account changed. Reload and try again." });
    return;
  }
  res.json(UpdateAdminWithdrawalAccountResponse.parse(updated.withdrawalAccount));
});

router.patch("/users/:id", async (req: AuthRequest, res: Response) => {
  const { status, role, name, phone, reason, profileHealth } = req.body;
  if (status && status !== "active" && !reason?.trim()) {
    res.status(400).json({ error: "reason is required when freezing or banning a user" });
    return;
  }
  if (profileHealth !== undefined) {
    const val = Number(profileHealth);
    if (Number.isNaN(val) || val < 0 || val > 100) {
      res.status(400).json({ error: "profileHealth must be a number between 0 and 100" });
      return;
    }
  }
  const allowed: Record<string, unknown> = {};
  if (status) {
    allowed.status = status;
    allowed.frozenReason = status !== "active" ? reason.trim() : undefined;
  }
  if (role) allowed.role = role;
  if (name) allowed.name = name;
  if (phone) allowed.phone = phone;
  const previousUser = profileHealth !== undefined ? await User.findById(req.params.id) : null;
  if (profileHealth !== undefined) allowed.profileHealth = Number(profileHealth);
  const user = await User.findByIdAndUpdate(req.params.id, allowed, { new: true });
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (status) {
    await Notification.create({
      userId: user._id,
      type: "system",
      title: status === "active" ? "Account Restored" : "Account Suspended",
      message: status === "active"
        ? "Your account access has been restored by admin."
        : `Your account has been ${status}. Reason: ${reason.trim()}`,
      data: { status, reason: reason?.trim() ?? null },
    });
  }

  if (profileHealth !== undefined && previousUser && previousUser.profileHealth !== user.profileHealth) {
    await Notification.create({
      userId: user._id,
      type: "system",
      title: "Profile Health Updated",
      message: `Your profile health score has been updated to ${user.profileHealth}%${reason?.trim() ? `. Reason: ${reason.trim()}` : "."}`,
      data: { profileHealth: user.profileHealth, reason: reason?.trim() ?? null },
    });
  }

  res.json(formatUser(user));
});

router.patch("/users/:id/balance", async (req: AuthRequest, res: Response) => {
  const { amount, type, reason } = req.body;
  if (!amount || !type || !reason) {
    res.status(400).json({ error: "amount, type, and reason required" });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const delta = type === "credit" ? Math.abs(amount) : -Math.abs(amount);
  user.balance = Math.max(0, user.balance + delta);
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: "adjustment",
    amount: Math.abs(amount),
    status: "approved",
    notes: `Admin ${type}: ${reason}`,
  });

  await Notification.create({
    userId: user._id,
    type: "balance_adjustment",
    title: `Balance ${type === "credit" ? "Credited" : "Debited"}`,
    message: `Your account balance has been ${type === "credit" ? "credited" : "debited"} by $${Math.abs(amount).toFixed(2)}. Reason: ${reason}`,
    data: { amount, type, reason },
  });

  res.json(formatUser(user));
});

router.post("/users/:id/wallet/reset", async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const { reason } = req.body;
  if (!reason) { res.status(400).json({ error: "reason is required" }); return; }

  user.balance = 0;
  user.totalDeposited = 0;
  user.totalWithdrawn = 0;
  user.totalProfit = 0;
  user.totalLoss = 0;
  await user.save();

  await Transaction.create({
    userId: user._id,
    type: "adjustment",
    amount: 0,
    status: "approved",
    notes: `Admin wallet reset: ${reason}`,
  });

  await Notification.create({
    userId: user._id,
    type: "balance_adjustment",
    title: "Wallet Reset",
    message: `Your wallet has been reset to $0.00 by admin. Reason: ${reason}`,
    data: { type: "reset", reason },
  });

  res.json(formatUser(user));
});

// ─── CHANGE USER PASSWORD ─────────────────────────────────────
router.patch("/users/:id/password", async (req: AuthRequest, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "newPassword must be at least 6 characters" });
    return;
  }
  const user = await User.findById(req.params.id).select("+password");
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated successfully" });
});

// ─── WITHDRAWAL BAN ───────────────────────────────────────────
router.patch("/users/:id/withdrawal-ban", async (req: AuthRequest, res: Response) => {
  const { banned, reason } = req.body;
  if (typeof banned !== "boolean") {
    res.status(400).json({ error: "banned (boolean) is required" });
    return;
  }
  if (banned && !reason?.trim()) {
    res.status(400).json({ error: "reason is required when banning withdrawal" });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  user.withdrawalBanned = banned;
  user.withdrawalBanReason = banned ? reason.trim() : undefined;
  await user.save();

  await Notification.create({
    userId: user._id,
    type: "balance_adjustment",
    title: banned ? "Withdrawal Suspended" : "Withdrawal Restored",
    message: banned
      ? `Your withdrawal access has been suspended. Reason: ${reason.trim()}`
      : "Your withdrawal access has been restored by admin.",
    data: { banned, reason: reason?.trim() ?? null },
  });

  res.json(formatUser(user));
});

// ─── TRADE BAN ────────────────────────────────────────────────
router.patch("/users/:id/trade-ban", async (req: AuthRequest, res: Response) => {
  const { banned, reason } = req.body;
  if (typeof banned !== "boolean") {
    res.status(400).json({ error: "banned (boolean) is required" });
    return;
  }
  if (banned && !reason?.trim()) {
    res.status(400).json({ error: "reason is required when banning trade" });
    return;
  }
  const user = await User.findById(req.params.id);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  user.tradeBanned = banned;
  user.tradeBanReason = banned ? reason.trim() : undefined;
  await user.save();

  await Notification.create({
    userId: user._id,
    type: "balance_adjustment",
    title: banned ? "Trading Suspended" : "Trading Restored",
    message: banned
      ? `Your trading access has been suspended. Reason: ${reason.trim()}`
      : "Your trading access has been restored by admin.",
    data: { banned, reason: reason?.trim() ?? null },
  });

  res.json(formatUser(user));
});

// ─── TRANSACTIONS ─────────────────────────────────────────────
router.get("/transactions", async (req: AuthRequest, res: Response) => {
  const { type, status, userId, limit = "20", page = "1" } = req.query as Record<string, string>;
  const query: Record<string, unknown> = {};
  if (type) query.type = type;
  if (status) query.status = status;
  if (userId) query.userId = userId;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pg - 1) * lim;

  const [transactions, total] = await Promise.all([
    Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("userId", "email name"),
    Transaction.countDocuments(query),
  ]);

  res.json({
    transactions: transactions.map((tx) => {
      const u = tx.userId as unknown as { email?: string; name?: string };
      return formatTx(tx, { email: u?.email, name: u?.name });
    }),
    total,
    page: pg,
    limit: lim,
  });
});

router.patch("/transactions/:id/approve", async (req: AuthRequest, res: Response) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  if (tx.status !== "pending") {
    res.status(400).json({ error: "Transaction is not pending" });
    return;
  }

  const adminNotes: string | undefined = req.body?.adminNotes?.trim() || undefined;
  tx.status = "approved";
  if (adminNotes) tx.notes = adminNotes;
  await tx.save();

  const user = await User.findById(tx.userId);
  if (user) {
    if (tx.type === "deposit") {
      user.balance += tx.amount;
      user.totalDeposited += tx.amount;
    } else if (tx.type === "withdrawal") {
      user.balance = Math.max(0, user.balance - tx.amount);
      user.totalWithdrawn += tx.amount;
    }
    await user.save();

    const settings = await getOrCreateSettings();
    const sym = settings.currencySymbol;
    const notesSuffix = adminNotes ? ` Note: ${adminNotes}` : "";
    await Notification.create({
      userId: user._id,
      type: tx.type === "deposit" ? "deposit_status" : "withdrawal_status",
      title: `${tx.type === "deposit" ? "Deposit" : "Withdrawal"} Approved`,
      message: `Your ${tx.type} of ${sym}${tx.amount.toFixed(2)} has been approved.${notesSuffix}`,
      data: { transactionId: tx._id, amount: tx.amount },
    });
  }

  const u = await User.findById(tx.userId);
  res.json(formatTx(tx, { email: u?.email, name: u?.name }));
});

router.patch("/transactions/:id/reject", async (req: AuthRequest, res: Response) => {
  const tx = await Transaction.findById(req.params.id);
  if (!tx) { res.status(404).json({ error: "Transaction not found" }); return; }
  if (tx.status !== "pending") {
    res.status(400).json({ error: "Transaction is not pending" });
    return;
  }

  tx.status = "rejected";
  tx.rejectionReason = req.body?.reason?.trim() || "Rejected by admin";
  await tx.save();

  const user = await User.findById(tx.userId);
  if (user) {
    const settings = await getOrCreateSettings();
    const sym = settings.currencySymbol;
    await Notification.create({
      userId: user._id,
      type: tx.type === "deposit" ? "deposit_status" : "withdrawal_status",
      title: `${tx.type === "deposit" ? "Deposit" : "Withdrawal"} Rejected`,
      message: `Your ${tx.type} of ${sym}${tx.amount.toFixed(2)} was rejected. Reason: ${tx.rejectionReason}`,
      data: { transactionId: tx._id },
    });
  }

  const u = await User.findById(tx.userId);
  res.json(formatTx(tx, { email: u?.email, name: u?.name }));
});

// ─── TRADES ───────────────────────────────────────────────────
router.get("/trades", async (req: AuthRequest, res: Response) => {
  const { userId, status, limit = "20", page = "1" } = req.query as Record<string, string>;
  const query: Record<string, unknown> = {};
  if (userId) query.userId = userId;
  if (status) query.status = status;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pg - 1) * lim;

  const [trades, total] = await Promise.all([
    Trade.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim).populate("userId", "email name"),
    Trade.countDocuments(query),
  ]);

  res.json({
    trades: trades.map((t) => {
      const u = t.userId as unknown as { email?: string; name?: string };
      return formatTrade(t, { email: u?.email, name: u?.name });
    }),
    total,
    page: pg,
    limit: lim,
  });
});

router.patch("/trades/:id/result", async (req: AuthRequest, res: Response) => {
  const { result } = req.body;
  if (!["win", "loss"].includes(result)) {
    res.status(400).json({ error: "result must be win or loss" });
    return;
  }

  const trade = await Trade.findById(req.params.id);
  if (!trade) { res.status(404).json({ error: "Trade not found" }); return; }

  const user = await User.findById(trade.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const profitLoss = result === "win"
    ? trade.amount * (trade.profitPercent / 100)
    : -trade.amount;

  trade.status = result as "win" | "loss";
  trade.profitLoss = profitLoss;
  trade.settledAt = new Date();
  await trade.save();

  if (result === "win") {
    user.balance += trade.amount + profitLoss;
    user.totalProfit += profitLoss;
    await Transaction.create({
      userId: user._id,
      type: "trade_win",
      amount: trade.amount + profitLoss,
      status: "approved",
      notes: `Admin override win: ${trade.symbol}`,
    });
  } else {
    user.totalLoss += trade.amount;
    await Transaction.create({
      userId: user._id,
      type: "trade_loss",
      amount: trade.amount,
      status: "approved",
      notes: `Admin override loss: ${trade.symbol}`,
    });
  }
  await user.save();

  await Notification.create({
    userId: user._id,
    type: "trade_result",
    title: result === "win" ? "Trade Won!" : "Trade Lost",
    message: result === "win"
      ? `Your ${trade.symbol} trade has been settled as a win. Profit: $${profitLoss.toFixed(2)}`
      : `Your ${trade.symbol} trade has been settled as a loss.`,
  });

  const u = await User.findById(trade.userId);
  res.json(formatTrade(trade, { email: u?.email, name: u?.name }));
});

// ─── PLATFORM SETTINGS ───────────────────────────────────────────────────────
router.get("/platform-settings", async (_req: AuthRequest, res: Response) => {
  const settings = await getOrCreateSettings();
  res.json(formatSettings(settings));
});

router.post("/platform-settings", async (req: AuthRequest, res: Response) => {
  const {
    currency, currencySymbol,
    profit60s, profit120s, profit180s, profit240s,
    lossPercent, minTradeAmount, maxTradeAmount, enabledSymbols,
  } = req.body;

  const update: Record<string, unknown> = {};
  if (currency) {
    update.currency = currency;
    update.currencySymbol = currencySymbol || CURRENCY_SYMBOLS[currency] || currency;
  }
  if (typeof profit60s  === "number") update.profit60s  = profit60s;
  if (typeof profit120s === "number") update.profit120s = profit120s;
  if (typeof profit180s === "number") update.profit180s = profit180s;
  if (typeof profit240s === "number") update.profit240s = profit240s;
  if (typeof lossPercent    === "number") update.lossPercent    = lossPercent;
  if (typeof minTradeAmount === "number") update.minTradeAmount = minTradeAmount;
  if (typeof maxTradeAmount === "number") update.maxTradeAmount = maxTradeAmount;
  if (Array.isArray(enabledSymbols)) update.enabledSymbols = enabledSymbols;

  const settings = await PlatformSettings.findOneAndUpdate(
    {},
    { $set: update },
    { new: true, upsert: true }
  );
  res.json(formatSettings(settings!));
});

// ─── TRADE SETTINGS ─────────────────────────────────────────────────────────
const ALL_SYMBOLS = [
  "BTCUSDT","BTCPKR","BTCINR",
  "ETHUSDT","ETHPKR","ETHINR",
  "BNBUSDT","BNBPKR",
  "USDTPKR","USDTINR",
  "BTSPKR","BTSINR",
];

router.get("/trade-settings", async (_req: AuthRequest, res: Response) => {
  const settings = await TradeSetting.find({});
  const settingsMap = Object.fromEntries(settings.map((s) => [s.symbol, s.outcome]));
  const result = ALL_SYMBOLS.map((sym) => ({ symbol: sym, outcome: settingsMap[sym] ?? "auto" }));
  res.json(result);
});

router.post("/trade-settings", async (req: AuthRequest, res: Response) => {
  const { symbol, outcome } = req.body;
  if (!symbol || !["auto", "win", "loss"].includes(outcome)) {
    res.status(400).json({ error: "symbol and outcome (auto|win|loss) required" });
    return;
  }
  const setting = await TradeSetting.findOneAndUpdate(
    { symbol },
    { outcome },
    { upsert: true, new: true }
  );
  res.json({ symbol: setting.symbol, outcome: setting.outcome });
});

export default router;
