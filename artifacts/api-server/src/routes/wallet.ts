import { Router } from "express";
import type { Response } from "express";
import { authMiddleware, checkFrozen, AuthRequest } from "../middlewares/auth.js";
import { User } from "../models/User.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";

const router = Router();
router.use(authMiddleware);

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

router.get("/", async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "Not found" }); return; }

  const pendingDeposits = await Transaction.countDocuments({ userId: req.userId, type: "deposit", status: "pending" });
  const pendingWithdrawals = await Transaction.countDocuments({ userId: req.userId, type: "withdrawal", status: "pending" });
  const recent = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(5);

  res.json({
    balance: user.balance,
    totalDeposited: user.totalDeposited,
    totalWithdrawn: user.totalWithdrawn,
    totalProfit: user.totalProfit,
    totalLoss: user.totalLoss,
    netPnl: user.totalProfit - user.totalLoss,
    pendingDeposits,
    pendingWithdrawals,
    recentTransactions: recent.map((tx) => formatTx(tx)),
  });
});

router.post("/deposit", checkFrozen, async (req: AuthRequest, res: Response) => {
  const { amount, method, proofUrl, notes } = req.body;
  if (!amount || amount <= 0 || !method) {
    res.status(400).json({ error: "amount and method required" });
    return;
  }
  const tx = await Transaction.create({
    userId: req.userId,
    type: "deposit",
    amount,
    status: "pending",
    method,
    proofUrl: proofUrl ?? null,
    notes: notes ?? null,
  });
  res.status(201).json(formatTx(tx));
});

router.post("/withdraw", checkFrozen, async (req: AuthRequest, res: Response) => {
  const { amount, method, accountDetails } = req.body;
  if (!amount || amount <= 0 || !method || !accountDetails) {
    res.status(400).json({ error: "amount, method, accountDetails required" });
    return;
  }
  const user = await User.findById(req.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.withdrawalBanned) {
    const reason = user.withdrawalBanReason || "Contact support for details.";
    res.status(403).json({ error: `Withdrawals are suspended on your account. Reason: ${reason}` });
    return;
  }
  if (user.balance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }
  const tx = await Transaction.create({
    userId: req.userId,
    type: "withdrawal",
    amount,
    status: "pending",
    method,
    accountDetails,
  });
  res.status(201).json(formatTx(tx));
});

router.get("/withdrawal-account", async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(user.withdrawalAccount ?? null);
});

router.patch("/withdrawal-account", async (req: AuthRequest, res: Response) => {
  const { currency, accountType, accountHolder, accountName, bankName, ifscNumber, accountTitle, accountNumber, accountHolderName, walletAddress } = req.body;
  if (!currency || !["INR", "PKR", "USDT"].includes(currency)) {
    res.status(400).json({ error: "currency must be one of: INR, PKR, USDT" });
    return;
  }

  if (currency === "INR") {
    if (!accountType || !["wallet", "bank"].includes(accountType)) {
      res.status(400).json({ error: "INR account requires accountType: wallet or bank" });
      return;
    }
    if (!accountHolder || !accountNumber) {
      res.status(400).json({ error: "INR account requires accountHolder and accountNumber" });
      return;
    }
    if (accountType === "wallet" && !accountName) {
      res.status(400).json({ error: "INR wallet account requires accountName (e.g. UPI)" });
      return;
    }
    if (accountType === "bank" && (!bankName || !ifscNumber)) {
      res.status(400).json({ error: "INR bank account requires bankName and ifscNumber" });
      return;
    }
  } else if (currency === "PKR") {
    if (!accountTitle || !accountNumber || !accountHolderName) {
      res.status(400).json({ error: "PKR account requires accountTitle, accountNumber, and accountHolderName" });
      return;
    }
  } else if (currency === "USDT") {
    if (!walletAddress) {
      res.status(400).json({ error: "USDT account requires walletAddress" });
      return;
    }
  }

  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const account: typeof user.withdrawalAccount = { currency };
  if (currency === "INR") {
    account!.accountType = accountType;
    account!.accountHolder = accountHolder;
    account!.accountNumber = accountNumber;
    if (accountType === "wallet") {
      account!.accountName = accountName;
    } else {
      account!.bankName = bankName;
      account!.ifscNumber = ifscNumber;
    }
  } else if (currency === "PKR") {
    account!.accountTitle = accountTitle;
    account!.accountNumber = accountNumber;
    account!.accountHolderName = accountHolderName;
  } else {
    account!.walletAddress = walletAddress;
  }

  user.withdrawalAccount = account;
  await user.save();
  res.json(user.withdrawalAccount);
});

router.get("/transactions", async (req: AuthRequest, res: Response) => {
  const { type, status, limit = "20", page = "1" } = req.query as Record<string, string>;
  const query: Record<string, unknown> = { userId: req.userId };
  if (type) query.type = type;
  if (status) query.status = status;

  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (pg - 1) * lim;

  const [transactions, total] = await Promise.all([
    Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(lim),
    Transaction.countDocuments(query),
  ]);

  res.json({ transactions: transactions.map((tx) => formatTx(tx)), total, page: pg, limit: lim });
});

export { formatTx };
export default router;
