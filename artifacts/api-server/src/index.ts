import { httpServer, connectDB, startBackgroundJobs } from "./app.js";
import { logger } from "./lib/logger.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

async function main() {
  await connectDB();
  await startBackgroundJobs();

  httpServer.listen(port, () => {
    logger.info({ port }, "CryptoTrade API Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
