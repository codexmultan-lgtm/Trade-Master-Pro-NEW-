import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import mongoose from "mongoose";
import { createServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { initMarkets, tickMarkets, setSocketIO } from "./services/marketSimulator.js";
import { settlePendingTrades, setSettlerSocketIO } from "./services/tradeSettler.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

const httpServer = createServer(app);

const io = new SocketServer(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
  path: "/socket.io",
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket connected");

  socket.on("join_user", (userId: string) => {
    socket.join(`user_${userId}`);
    logger.info({ socketId: socket.id, userId }, "User joined room");
  });

  socket.on("subscribe_symbol", (symbol: string) => {
    socket.join(`symbol_${symbol}`);
  });

  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket disconnected");
  });
});

setSocketIO(io);
setSettlerSocketIO(io);

async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  await mongoose.connect(uri);
  logger.info("MongoDB connected");
}

async function startBackgroundJobs(): Promise<void> {
  await initMarkets();

  // Tick market prices every 2 seconds
  setInterval(async () => {
    try { await tickMarkets(); } catch (err) { logger.error({ err }, "Market tick error"); }
  }, 2000);

  // Settle expired trades every 3 seconds
  setInterval(async () => {
    try { await settlePendingTrades(); } catch (err) { logger.error({ err }, "Trade settler error"); }
  }, 3000);
}

export { httpServer, connectDB, startBackgroundJobs };
export default app;
