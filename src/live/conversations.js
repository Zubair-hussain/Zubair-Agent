// ─────────────────────────────────────────────────────────────────────────────
//  Conversation model — one thread per visitor, shared by three authors:
//    "visitor"  the person on the website
//    "ai"       Zubair AI (instant answers)
//    "zubair"   Zubair himself, replying from the admin inbox
// ─────────────────────────────────────────────────────────────────────────────
import crypto from "node:crypto";
import config from "../config.js";
import store from "../lib/store.js";

const INDEX_KEY = "convs";
const PRESENCE_KEY = "admin:seen";
const TTL = config.chat.conversationTtlSeconds;

const metaKey = (id) => `conv:${id}`;
const messagesKey = (id) => `conv:${id}:m`;
const seqKey = (id) => `conv:${id}:seq`;
const typingKey = (id, who) => `conv:${id}:typing:${who}`;

const parse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ── Presence ────────────────────────────────────────────────────────────────
export const touchAdminPresence = () => store.set(PRESENCE_KEY, Date.now());

export const getStatus = async () => {
  const lastSeenAt = Number(await store.get(PRESENCE_KEY)) || null;
  return {
    online: Boolean(lastSeenAt && Date.now() - lastSeenAt < config.chat.onlineWindowMs),
    lastSeenAt,
    replyTime: config.chat.replyTimeLabel,
  };
};

// ── Conversations ───────────────────────────────────────────────────────────
export const getConversation = async (id) => parse(await store.get(metaKey(id)));

const saveConversation = async (meta) => {
  await store.set(metaKey(meta.id), JSON.stringify(meta), TTL);
  return meta;
};

export const createConversation = async ({ page }) => {
  const now = Date.now();
  const meta = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    name: "",
    email: "",
    page: page || "",
    preview: "",
    lastAuthor: "",
    unread: 0, // visitor messages Zubair has not opened yet
    aiEnabled: true,
    aiPausedUntil: 0,
    handoff: false, // visitor explicitly asked for Zubair
    lastIntent: "",
  };
  await saveConversation(meta);
  await store.zadd(INDEX_KEY, now, meta.id);
  return meta;
};

export const updateConversation = async (id, patch) => {
  const meta = await getConversation(id);
  if (!meta) return null;
  return saveConversation({ ...meta, ...patch });
};

export const deleteConversation = async (id) => {
  await store.del(metaKey(id), messagesKey(id), seqKey(id), typingKey(id, "visitor"), typingKey(id, "zubair"));
  await store.zrem(INDEX_KEY, id);
};

export const listConversations = async (limit = 50) => {
  const ids = await store.zrevrange(INDEX_KEY, 0, limit - 1);
  // One MGET for the whole list instead of one GET per conversation.
  const metas = (await store.mget(ids.map(metaKey))).map(parse);
  // Expired conversations leave a dangling index entry — prune as we go.
  await Promise.all(ids.filter((_, i) => !metas[i]).map((id) => store.zrem(INDEX_KEY, id)));
  return metas.filter(Boolean);
};

// ── Messages ────────────────────────────────────────────────────────────────
export const addMessage = async (id, author, text, metaPatch = {}) => {
  const meta = await getConversation(id);
  if (!meta) return null;

  const now = Date.now();
  const message = { id: await store.incr(seqKey(id)), author, text, at: now };
  await store.rpush(messagesKey(id), JSON.stringify(message), config.chat.maxMessagesPerConversation);
  await Promise.all([store.expire(messagesKey(id), TTL), store.expire(seqKey(id), TTL)]);

  await saveConversation({
    ...meta,
    updatedAt: now,
    preview: text.replace(/\*\*/g, "").replace(/\s+/g, " ").slice(0, 120),
    lastAuthor: author,
    lastId: message.id, // lets pollers skip reading messages when nothing is new
    unread: author === "visitor" ? meta.unread + 1 : meta.unread,
    ...metaPatch,
  });
  await store.zadd(INDEX_KEY, now, id);
  return message;
};

export const getMessages = async (id, after = 0) => {
  const raw = await store.lrange(messagesKey(id), 0, -1);
  return raw.map(parse).filter((m) => m && m.id > after);
};

// ── Typing indicators (auto-expire) ─────────────────────────────────────────
export const setTyping = (id, who) => store.set(typingKey(id, who), "1", 6);
export const isTyping = async (id, who) => Boolean(await store.get(typingKey(id, who)));
