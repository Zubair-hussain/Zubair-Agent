// Visitor-facing live chat API (used by the website widget).
import config from "../config.js";
import { signVisitorToken } from "../lib/auth.js";
import { cleanLine, cleanText, isEmail } from "../lib/sanitize.js";
import { notifyAdmin } from "../lib/push.js";
import { hit } from "../lib/rateLimit.js";
import { sendLiveChatAlert } from "../handlers/emailService.js";
import { generateReply } from "../engine/agent.js";
import {
  addMessage, createConversation, getConversation, getMessages, getStatus,
  isTyping, setTyping, updateConversation,
} from "../live/conversations.js";

const notFound = (res) =>
  res.status(404).json({ success: false, error: "Conversation not found.", code: "CONVERSATION_GONE" });

const afterParam = (req) => {
  const n = Number(req.query.after);
  return Number.isSafeInteger(n) && n > 0 ? n : 0;
};

const readText = (req) => cleanText(req.body?.text, config.chat.maxMessageLength);

/** Store the visitor's message, let the AI answer when appropriate, alert Zubair. */
const handleVisitorMessage = async (req, meta, text) => {
  const status = await getStatus();
  const visitorMessage = await addMessage(meta.id, "visitor", text);
  const created = [visitorMessage];

  // The AI steps aside while Zubair is actively replying in this conversation.
  const aiActive = meta.aiEnabled && Date.now() > (meta.aiPausedUntil || 0);
  let handoff = false;

  if (aiActive) {
    const result = await generateReply(text, { lastIntent: meta.lastIntent, adminOnline: status.online });
    handoff = result.handoff;
    const aiMessage = await addMessage(meta.id, "ai", result.reply, {
      lastIntent: result.intent,
      ...(handoff ? { handoff: true } : {}),
    });
    created.push(aiMessage);
  }

  // Alert Zubair. Awaited on purpose: a serverless function may be frozen the
  // moment the response is sent, which would silently drop the notification.
  const who = meta.name || meta.email || "Website visitor";
  const push = await notifyAdmin({
    title: handoff ? `🙋 ${who} wants to talk to you` : `💬 ${who}`,
    body: text,
    conversationId: meta.id,
  });

  // No push device reached → fall back to one email per conversation per hour.
  if (push.sent === 0 && config.email.enabled && !status.online) {
    const alerts = await hit("live-email", meta.id, 60 * 60).catch(() => 2);
    if (alerts === 1) {
      await sendLiveChatAlert({
        name: meta.name,
        email: meta.email,
        page: meta.page,
        text,
        inboxUrl: `${req.protocol}://${req.get("host")}/admin`,
      }).catch(() => {});
    }
  }

  return { created, status, aiActive };
};

// GET /api/live/status — public, tiny, cacheable.
export const statusHandler = async (_req, res, next) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=15");
    res.json({ success: true, status: await getStatus() });
  } catch (err) {
    next(err);
  }
};

// POST /api/live/conversations  { text, page? } — starts a thread with its first message.
export const startConversationHandler = async (req, res, next) => {
  try {
    const text = readText(req);
    if (!text) return res.status(400).json({ success: false, error: "Message is required." });

    const meta = await createConversation({ page: cleanLine(req.body?.page, 200) });
    const { created, status, aiActive } = await handleVisitorMessage(req, meta, text);

    res.status(201).json({
      success: true,
      conversationId: meta.id,
      token: signVisitorToken(meta.id),
      messages: created,
      status,
      aiActive,
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/live/messages  { text }
export const sendMessageHandler = async (req, res, next) => {
  try {
    const text = readText(req);
    if (!text) return res.status(400).json({ success: false, error: "Message is required." });

    const meta = await getConversation(req.conversationId);
    if (!meta) return notFound(res);

    const { created, status, aiActive } = await handleVisitorMessage(req, meta, text);
    res.status(201).json({ success: true, messages: created, status, aiActive });
  } catch (err) {
    next(err);
  }
};

// GET /api/live/messages?after=<lastId> — the widget polls this.
export const pollMessagesHandler = async (req, res, next) => {
  try {
    const meta = await getConversation(req.conversationId);
    if (!meta) return notFound(res);

    const [messages, status, typing] = await Promise.all([
      getMessages(meta.id, afterParam(req)),
      getStatus(),
      isTyping(meta.id, "zubair"),
    ]);

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      messages,
      status,
      typing,
      aiActive: meta.aiEnabled && Date.now() > (meta.aiPausedUntil || 0),
      identified: Boolean(meta.email),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/live/identify  { name?, email? } — "leave your email" prompt.
export const identifyHandler = async (req, res, next) => {
  try {
    const name = cleanLine(req.body?.name, 80);
    const email = cleanLine(req.body?.email, 160).toLowerCase();
    if (email && !isEmail(email)) return res.status(400).json({ success: false, error: "Enter a valid email." });
    if (!name && !email) return res.status(400).json({ success: false, error: "Name or email is required." });

    const meta = await updateConversation(req.conversationId, {
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
    });
    if (!meta) return notFound(res);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// POST /api/live/typing — fire-and-forget "visitor is typing".
export const typingHandler = async (req, res, next) => {
  try {
    await setTyping(req.conversationId, "visitor");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
