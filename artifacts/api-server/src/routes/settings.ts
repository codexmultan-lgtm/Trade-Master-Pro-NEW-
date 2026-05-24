import { Router } from "express";
import type { Request, Response } from "express";
import { getOrCreateSettings, formatSettings } from "../models/PlatformSettings.js";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  res.json(formatSettings(settings));
});

export default router;
