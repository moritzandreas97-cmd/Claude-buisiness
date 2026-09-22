import { Router } from "express";
import rateLimit from "express-rate-limit";
import { db } from "../db.js";

const router = Router();

// Nur Events, die ausschliesslich im Client bekannt sind (reine UI-Momente).
// test_created, test_opened, test_started, attempt_completed und
// child_test_created werden serverseitig an der jeweiligen Aktion geloggt,
// damit sie nicht durch beliebige Client-Aufrufe faelschbar sind.
const CLIENT_EVENT_TYPES = new Set([
  "share_clicked",
  "copy_link_clicked",
  "result_viewed",
  "result_shared",
  "viral_cta_clicked",
]);

const eventsLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/", eventsLimiter, (req, res) => {
  const { type, publicToken } = req.body as { type?: unknown; publicToken?: unknown };

  if (typeof type !== "string" || !CLIENT_EVENT_TYPES.has(type)) {
    return res.status(400).json({ error: "invalid_event_type" });
  }
  if (typeof publicToken !== "string" || publicToken.length === 0) {
    return res.status(400).json({ error: "invalid_public_token" });
  }

  const test = db.prepare("SELECT id FROM tests WHERE public_token = ?").get(publicToken) as
    | { id: number }
    | undefined;
  if (!test) {
    return res.status(404).json({ error: "not_found" });
  }

  db.prepare("INSERT INTO events (test_id, event_type) VALUES (?, ?)").run(test.id, type);
  res.status(204).end();
});

export default router;
