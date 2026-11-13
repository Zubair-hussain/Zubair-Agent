// Admin (Zubair) API — login + the live-chat inbox. Every route except login
// is behind requireAdmin (HttpOnly JWT cookie) and the same-origin CSRF guard.
import config from "../config.js";
import {
  clearAdminCookie, safeEqual, setAdminCookie, signAdminToken, verifyPassword,
} from "../lib/auth.js";
import { clientIp, hit, peek, reset, retryAfter } from "../lib/rateLimit.js";
import { cleanText, isUuid } from "../lib/sanitize.js";
import { isValidSubscription, removeSubscription, saveSubscription } from "../lib/push.js";
import {
  addMessage, deleteConversation, getConversation, getMessages, isTyping,
  listConversations, setTyping, touchAdminPresence, updateConversation,
} from "../live/conversations.js";

const LOCK_WINDOW = 15 * 60; // seconds
const MAX_FAILS_PER_IP = 5;
const MAX_FAILS_GLOBAL = 30; // slows distributed guessing across many IPs

// A real scrypt hash to burn the same CPU time when the username is wrong, so
// response timing does not reveal whether a username exists.
const DUMMY_HASH =
  "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

// POST /api/admin/login  { username, password }
export const loginHandler = async (req, res, next) => {
  try {
    if (!config.admin.enabled) {
      return res.status(503).json({ success: false, error: "Admin login is not configured on this server." });
    }

    const ip = clientIp(req);
    const [ipFails, globalFails] = await Promise.all([peek("login-ip", ip), peek("login-all", "all")]);
    if (ipFails >= MAX_FAILS_PER_IP || globalFails >= MAX_FAILS_GLOBAL) {
      const wait = await retryAfter(ipFails >= MAX_FAILS_PER_IP ? "login-ip" : "login-all", ipFails >= MAX_FAILS_PER_IP ? ip : "all");
      res.setHeader("Retry-After", wait);
      return res.status(429).json({ success: false, error: `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute(s).` });
    }

    const username = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase().slice(0, 64) : "";
    const password = typeof req.body?.password === "string" ? req.body.password.slice(0, 256) : "";

    const userOk = safeEqual(username, config.admin.username);
    const passOk = await verifyPassword(password, userOk ? config.admin.passwordHash : DUMMY_HASH);

    if (!userOk || !passOk || !password) {
      await Promise.all([hit("login-ip", ip, LOCK_WINDOW), hit("login-all", "all", LOCK_WINDOW)]);
      // One generic message: never reveal which half was wrong.
      return res.status(401).json({ success: false, error: "Invalid username or password." });
    }

    await reset("login-ip", ip);
    setAdminCookie(res, signAdminToken());
    await touchAdminPresence();
    res.json({ success: true, username: config.admin.username });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/logout
export const logoutHandler = (_req, res) => {
  clearAdminCookie(res);
  res.json({ success: true });
};

// GET /api/admin/me
export const meHandler = (req, res) => {
  res.json({
    success: true,
    username: req.admin.sub,
    push: { enabled: config.push.enabled, publicKey: config.push.publicKey },
    storePersistent: config.store.persistent,
  });
};

// GET /api/admin/conversations[?active=1] — also acts as the presence heartbeat.
export const listHandler = async (req, res, next) => {
  try {
    if (req.query.active === "1") await touchAdminPresence();
    const conversations = await listConversations(60);
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, conversations, unreadTotal: conversations.reduce((n, c) => n + (c.unread || 0), 0) });
  } catch (err) {
    next(err);
  }
};

const withConversation = (handler) => async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ success: false, error: "Invalid conversation id." });
    const meta = await getConversation(req.params.id);
    if (!meta) return res.status(404).json({ success: false, error: "Conversation not found." });
    await handler(req, res, meta);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/conversations/:id?after=<lastId> — opening a thread marks it read.
export const threadHandler = withConversation(async (req, res, meta) => {
  const after = Number(req.query.after);
  const [messages, typing] = await Promise.all([
    getMessages(meta.id, Number.isSafeInteger(after) && after > 0 ? after : 0),
    isTyping(meta.id, "visitor"),
  ]);
  const conversation = meta.unread ? await updateConversation(meta.id, { unread: 0 }) : meta;
  res.setHeader("Cache-Control", "no-store");
  res.json({ success: true, conversation, messages, typing });
});

// POST /api/admin/conversations/:id/messages  { text } — Zubair replies.
export const replyHandler = withConversation(async (req, res, meta) => {
  const text = cleanText(req.body?.text, config.chat.maxMessageLength);
  if (!text) return res.status(400).json({ success: false, error: "Message is required." });

  await touchAdminPresence();
  const message = await addMessage(meta.id, "zubair", text, {
    unread: 0,
    handoff: false,
    // Zubair is talking — keep the AI out of the way for a while.
    aiPausedUntil: Date.now() + config.chat.aiPauseAfterHumanMs,
  });
  res.status(201).json({ success: true, message });
});

// PATCH /api/admin/conversations/:id  { aiEnabled?: boolean }
export const patchHandler = withConversation(async (req, res, meta) => {
  if (typeof req.body?.aiEnabled !== "boolean") {
    return res.status(400).json({ success: false, error: "aiEnabled (boolean) is required." });
  }
  const conversation = await updateConversation(meta.id, {
    aiEnabled: req.body.aiEnabled,
    ...(req.body.aiEnabled ? { aiPausedUntil: 0 } : {}),
  });
  res.json({ success: true, conversation });
});

// DELETE /api/admin/conversations/:id
export const deleteHandler = withConversation(async (_req, res, meta) => {
  await deleteConversation(meta.id);
  res.json({ success: true });
});

// POST /api/admin/conversations/:id/typing
export const adminTypingHandler = withConversation(async (_req, res, meta) => {
  await setTyping(meta.id, "zubair");
  res.status(204).end();
});

// POST /api/admin/push/subscribe  { subscription }
export const subscribeHandler = async (req, res, next) => {
  try {
    if (!config.push.enabled) return res.status(503).json({ success: false, error: "Push is not configured." });
    const subscription = req.body?.subscription;
    if (!isValidSubscription(subscription)) {
      return res.status(400).json({ success: false, error: "Invalid push subscription." });
    }
    await saveSubscription(subscription);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/push/unsubscribe  { endpoint }
export const unsubscribeHandler = async (req, res, next) => {
  try {
    await removeSubscription(req.body?.endpoint);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
