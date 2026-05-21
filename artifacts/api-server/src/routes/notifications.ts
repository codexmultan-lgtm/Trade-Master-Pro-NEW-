import { Router } from "express";
import type { Response } from "express";
import { authMiddleware, AuthRequest } from "../middlewares/auth.js";
import { Notification } from "../models/Notification.js";

const router = Router();
router.use(authMiddleware);

function formatNotif(n: InstanceType<typeof Notification>) {
  return {
    id: n._id.toString(),
    userId: n.userId.toString(),
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    data: n.data ?? null,
    createdAt: n.createdAt,
  };
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const { unread, limit = "20" } = req.query as Record<string, string>;
  const query: Record<string, unknown> = { userId: req.userId };
  if (unread === "true") query.read = false;
  const lim = Math.min(parseInt(limit, 10) || 20, 100);
  const notifs = await Notification.find(query).sort({ createdAt: -1 }).limit(lim);
  res.json(notifs.map(formatNotif));
});

router.patch("/:id/read", async (req: AuthRequest, res: Response) => {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.userId },
    { read: true },
    { new: true }
  );
  if (!notif) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatNotif(notif));
});

router.patch("/read-all", async (req: AuthRequest, res: Response) => {
  await Notification.updateMany({ userId: req.userId, read: false }, { read: true });
  res.json({ message: "All marked as read" });
});

router.get("/unread-count", async (req: AuthRequest, res: Response) => {
  const count = await Notification.countDocuments({ userId: req.userId, read: false });
  res.json({ count });
});

export default router;
