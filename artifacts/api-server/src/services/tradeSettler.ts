import { Trade } from "../models/Trade.js";
import { Transaction } from "../models/Transaction.js";
import { Notification } from "../models/Notification.js";
import { User } from "../models/User.js";
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

      const isWin = trade.direction === "up"
        ? exitPrice > trade.entryPrice
        : exitPrice < trade.entryPrice;

      const profitLoss = isWin
        ? trade.amount * (trade.profitPercent / 100)
        : -trade.amount;

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
        user.totalLoss += trade.amount;
        await Transaction.create({
          userId: user._id,
          type: "trade_loss",
          amount: trade.amount,
          status: "approved",
          notes: `Trade loss: ${trade.symbol} ${trade.direction.toUpperCase()}`,
        });
      }
      await user.save();

      await Notification.create({
        userId: user._id,
        type: "trade_result",
        title: isWin ? "Trade Won!" : "Trade Lost",
        message: isWin
          ? `Your ${trade.symbol} ${trade.direction.toUpperCase()} trade won! Profit: $${profitLoss.toFixed(2)}`
          : `Your ${trade.symbol} ${trade.direction.toUpperCase()} trade closed at a loss of $${trade.amount.toFixed(2)}`,
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
          message: isWin ? `Profit: $${profitLoss.toFixed(2)}` : `Loss: $${trade.amount.toFixed(2)}`,
        });
      }

      logger.info({ tradeId: trade._id, result: trade.status }, "Trade settled");
    } catch (err) {
      logger.error({ err, tradeId: trade._id }, "Error settling trade");
    }
  }
}
