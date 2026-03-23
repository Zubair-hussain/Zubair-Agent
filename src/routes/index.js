import { Router } from "express";
import {
  chatHandler, historyHandler, clearSessionHandler, statsHandler
} from "../controllers/chatController.js";
import {
  contractHandler, contactHandler, profileHandler,
  pricingHandler, timezoneHandler, searchHandler
} from "../controllers/index.js";
import {
  chatLimiter, contactLimiter, contractLimiter, searchLimiter,
  validateChat, validateContact, validateContract
} from "../middleware/index.js";

const router = Router();

// ── CHAT ──────────────────────────────────────────────────────────────────────
router.post("/chat",                  chatLimiter, validateChat, chatHandler);
router.get("/chat/history/:sessionId", historyHandler);
router.get("/chat/stats",             statsHandler);
router.delete("/chat/:sessionId",     clearSessionHandler);

// ── CONTRACT ──────────────────────────────────────────────────────────────────
router.post("/contract", contractLimiter, validateContract, contractHandler);

// ── CONTACT ───────────────────────────────────────────────────────────────────
router.post("/contact", contactLimiter, validateContact, contactHandler);

// ── SEARCH ────────────────────────────────────────────────────────────────────
router.post("/search", searchLimiter, searchHandler);

// ── PROFILE ───────────────────────────────────────────────────────────────────
router.get("/profile",           profileHandler);
router.get("/profile/pricing",   pricingHandler);
router.get("/profile/timezone",  timezoneHandler);

export default router;
