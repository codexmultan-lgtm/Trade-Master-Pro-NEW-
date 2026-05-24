import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import walletRouter from "./wallet.js";
import tradesRouter from "./trades.js";
import marketsRouter from "./markets.js";
import notificationsRouter from "./notifications.js";
import adminRouter from "./admin.js";
import settingsRouter from "./settings.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/wallet", walletRouter);
router.use("/trades", tradesRouter);
router.use("/markets", marketsRouter);
router.use("/notifications", notificationsRouter);
router.use("/admin", adminRouter);
router.use("/settings", settingsRouter);

export default router;
