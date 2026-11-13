import { Router } from "express";
import cors from "cors";
import config from "../config.js";
import { requireAdmin, requireVisitor, sameOriginOnly } from "../lib/auth.js";
import { rateLimit } from "../lib/rateLimit.js";
import {
  chatHandler, contractHandler, contactHandler, profileHandler,
  pricingHandler, timezoneHandler, searchHandler,
} from "../controllers/index.js";
import {
  agentHandler, identifyHandler, pollMessagesHandler, sendMessageHandler,
  startConversationHandler, statusHandler, typingHandler,
} from "../controllers/liveController.js";
import {
  adminTypingHandler, deleteHandler, listHandler, loginHandler, logoutHandler, meHandler,
  patchHandler, replyHandler, subscribeHandler, threadHandler, unsubscribeHandler,
} from "../controllers/adminController.js";

const router = Router();

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const byConversation = (req) => req.conversationId;

// ── ADMIN ─────────────────────────────────────────────────────────────────────
// Deliberately mounted BEFORE cors(): admin routes send no CORS headers at all,
// so only the inbox served from this same origin can ever call them.
const admin = Router();
admin.use(sameOriginOnly);
admin.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
admin.post("/login", rateLimit("login-req", 20, 15 * MINUTE), loginHandler);
admin.post("/logout", logoutHandler);
admin.use(requireAdmin);
admin.get("/me", meHandler);
admin.get("/conversations", listHandler);
admin.get("/conversations/:id", threadHandler);
admin.patch("/conversations/:id", patchHandler);
admin.delete("/conversations/:id", deleteHandler);
admin.post("/conversations/:id/messages", replyHandler);
admin.post("/conversations/:id/typing", adminTypingHandler);
admin.post("/push/subscribe", subscribeHandler);
admin.post("/push/unsubscribe", unsubscribeHandler);
router.use("/admin", admin);

// ── PUBLIC API (strict origin allow-list, no cookies) ─────────────────────────
const isAllowedOrigin = (req, origin) => {
  if (!origin) return true; // non-browser clients (curl, server-to-server) send no Origin
  if (config.allowedOrigins.includes(origin)) return true;
  try {
    return new URL(origin).host === req.headers.host; // the inbox / same-origin tools
  } catch {
    return false;
  }
};

// CORS alone only hides the RESPONSE from a foreign page; this also refuses to
// PROCESS browser requests coming from sites that are not on the allow-list.
router.use((req, res, next) => {
  if (isAllowedOrigin(req, req.headers.origin)) return next();
  res.status(403).json({ success: false, error: "Origin not allowed." });
});

router.use(
  cors({
    origin: (origin, callback) => callback(null, !origin || config.allowedOrigins.includes(origin)),
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 600,
  })
);
// Writes share a global per-IP limit. Reads (polling) already have their own
// per-conversation limit, so they skip this one to save Redis commands.
const globalLimit = rateLimit("global", 240, MINUTE);
router.use((req, res, next) => (req.method === "GET" ? next() : globalLimit(req, res, next)));

// Live chat (website widget)
router.get("/live/status", statusHandler);
router.post(
  "/live/conversations",
  rateLimit("live-start", 8, HOUR),
  rateLimit("live-start-day", 30, 24 * HOUR),
  startConversationHandler
);
router.get("/live/messages", requireVisitor, rateLimit("live-poll", 90, MINUTE, byConversation), pollMessagesHandler);
router.post(
  "/live/messages",
  requireVisitor,
  rateLimit("live-send-ip", 30, MINUTE),
  rateLimit("live-send", 12, MINUTE, byConversation),
  rateLimit("live-send-day", 400, 24 * HOUR, byConversation),
  sendMessageHandler
);
router.post("/live/identify", requireVisitor, rateLimit("live-identify", 6, HOUR, byConversation), identifyHandler);
router.post("/live/agent", requireVisitor, rateLimit("live-agent", 20, HOUR, byConversation), agentHandler);
router.post("/live/typing", requireVisitor, rateLimit("live-typing", 30, MINUTE, byConversation), typingHandler);

// Stateless AI + utilities
router.post("/chat", rateLimit("chat", 30, MINUTE), chatHandler);
router.post("/contract", rateLimit("contract", 3, HOUR), contractHandler);
router.post("/contact", rateLimit("contact", 5, 10 * MINUTE), contactHandler);
router.post("/search", rateLimit("search", 10, MINUTE), searchHandler);
router.get("/profile", profileHandler);
router.get("/profile/pricing", pricingHandler);
router.get("/profile/timezone", timezoneHandler);

export default router;
