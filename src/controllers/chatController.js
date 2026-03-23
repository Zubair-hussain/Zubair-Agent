import { v4 as uuidv4 } from "uuid";
import { detectIntent } from "../engine/intentEngine.js";
import { buildResponse } from "../engine/responseBuilder.js";
import { searchWeb, formatSearchResults } from "../handlers/searchHandler.js";

// Session store: sessionId -> { history, createdAt }
const sessions = new Map();
const MAX_HISTORY = 20;

/**
 * POST /api/chat
 */
export const chatHandler = async (req, res, next) => {
  try {
    const { message, sessionId } = req.body;
    const sid = sessionId || uuidv4();
    const trimmed = message.trim();

    if (!sessions.has(sid)) {
      sessions.set(sid, { history: [], createdAt: Date.now() });
    }
    const session = sessions.get(sid);

    const intent = detectIntent(trimmed);
    let reply;

    if (intent === "search") {
      try {
        const results = await searchWeb(trimmed);
        reply = formatSearchResults(results, trimmed);
      } catch (err) {
        reply = buildResponse("unknown", trimmed);
      }
    } else {
      reply = buildResponse(intent, trimmed);
    }

    session.history.push({ role: "user", content: trimmed });
    session.history.push({ role: "agent", content: reply });
    if (session.history.length > MAX_HISTORY) {
      session.history = session.history.slice(-MAX_HISTORY);
    }

    res.json({ success: true, sessionId: sid, intent, reply, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/chat/history/:sessionId
 */
export const historyHandler = (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ success: false, error: "Session not found." });
  res.json({ success: true, sessionId: req.params.sessionId, history: session.history });
};

/**
 * DELETE /api/chat/:sessionId
 */
export const clearSessionHandler = (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true, message: "Session cleared." });
};

/**
 * GET /api/chat/stats
 */
export const statsHandler = (_req, res) => {
  res.json({
    success: true,
    activeSessions: sessions.size,
    sessions: [...sessions.keys()].map((id) => ({
      id,
      turns: Math.floor(sessions.get(id).history.length / 2),
      age: Math.round((Date.now() - sessions.get(id).createdAt) / 1000) + "s",
    })),
  });
};
