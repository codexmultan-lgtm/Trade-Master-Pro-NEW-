import { Router } from "express";
import { User } from "../models/User.js";
import { generateToken, authMiddleware, AuthRequest } from "../middlewares/auth.js";
import type { Response } from "express";

const router = Router();

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
  };
}

router.post("/register", async (req, res: Response) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }
  const user = await User.create({ name, email, password, phone, balance: 10000 });
  const token = generateToken(user._id.toString(), user.role);
  res.status(201).json({ token, user: formatUser(user) });
});

router.post("/login", async (req, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await user.comparePassword(password))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.status !== "active") {
    res.status(403).json({ error: "Account is frozen or banned" });
    return;
  }
  user.lastLoginAt = new Date();
  await user.save();
  const token = generateToken(user._id.toString(), user.role);
  res.json({ token, user: formatUser(user) });
});

router.post("/logout", (_req, res: Response) => {
  res.json({ message: "Logged out" });
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.userId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(user));
});

router.patch("/me/password", authMiddleware, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.userId).select("+password");
  if (!user) { res.status(404).json({ error: "Not found" }); return; }
  if (!(await user.comparePassword(currentPassword))) {
    res.status(400).json({ error: "Current password incorrect" });
    return;
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: "Password changed" });
});

export default router;
