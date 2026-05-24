import { Trade } from "../models/Trade.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
import { TradeSetting } from "../models/TradeSetting.js";
import { Server as SocketServer } from "socket.io";
import { getCurrentPrice } from "./marketSimulator.js";
import { logger } from "../lib/logger.js";

let io: SocketServer | null = null;

export function setSettlerSocketIO(socketIO: SocketServer): void {
  io = socketIO;
}

export async function settlePendingTrades(): Promise<void> {
  const now = new Date();
  const expiredTrades = await Trade.find({ status: "active", expiresAt: { $lte: now } });

  for (const trade of expiredTrades) {
    try {
      const exitPrice = getCurrentPrice(trade.symbol);
      if (!exitPrice) continue;

      const setting = await TradeSetting.findOne({ symbol: trade.symbol });
      const forcedOutcome = setting?.outcome ?? "auto";
      let isWin: boolean;
      if (forcedOutcome === "win") {
        isWin = true;
      } else if (forcedOutcome === "loss") {
        isWin = false;
      } else {
        isWin = trade.direction === "up"
          ? exitPrice > trade.entryPrice
          : exitPrice < trade.entryPrice;
      }

      const lossPercent = (trade as any).lossPercent ?? 100;
      const profitLoss = isWin
        ? trade.amount * (trade.profitPercent / 100)
        : -(trade.amount * (lossPercent / 100));

      trade.exitPrice = exitPrice;
      trade.profitLoss = profitLoss;
      trade.status = isWin ? "win" : "loss";
      trade.settledAt = now;
      await trade.save();

      const user = await User.findById(trade.userId);
      if (!user) continue;

      if (isWin) {
        user.balance += trade.amount + profitLoss;
        user.totalProfit += profitLoss;
        await Transaction.create({
          userId: user._id,
          type: "trade_win",
          amount: trade.amount + profitLoss,
          status: "approved",
          notes: `Trade win: ${trade.symbol} ${trade.direction.toUpperCase()}`,
        });
      } else {
        const actualLoss = trade.amount * (lossPercent / 100);
        const refund = trade.amount - actualLoss;
        if (refund > 0) user.balance += refund;
        user.totalLoss += actualLoss;
        await Transaction.create({
          userId: user._id,
          type: "trade_loss",
          amount: actualLoss,
          status: "approved",
          notes: `Trade loss: ${trade.symbol} ${trade.direction.toUpperCase()} (${lossPercent}% loss)`,
        });
      }
      await user.save();

      const profitAbs = Math.abs(profitLoss).toFixed(2);
      await Notification.create({
        userId: user._id,
        type: "trade_result",
        title: isWin ? "Trade Won!" : "Trade Lost",
        message: isWin
          ? `Your ${trade.symbol} ${trade.direction.toUpperCase()} trade won! Profit: ${profitAbs}`
          : `Your ${trade.symbol} ${trade.direction.toUpperCase()} trade closed at a loss of ${profitAbs}`,
        data: { tradeId: trade._id, result: trade.status, exitPrice, profitLoss },
      });

      if (io) {
        io.to(`user_${trade.userId}`).emit("trade_settled", {
          tradeId: trade._id,
          result: trade.status,
          exitPrice,
          profitLoss,
        });
        io.to(`user_${trade.userId}`).emit("notification", {
          type: "trade_result",
          title: isWin ? "Trade Won!" : "Trade Lost",
          message: isWin ? `Profit: ${profitAbs}` : `Loss: ${profitAbs}`,
        });
      }

      logger.info({ tradeId: trade._id, result: trade.status }, "Trade settled");
    } catch (err) {
      logger.error({ err, tradeId: trade._id }, "Error settling trade");
    }
  }
}
