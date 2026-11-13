// Store-backed fixed-window rate limiter. Unlike an in-process counter it keeps
// working across Vercel's many short-lived serverless instances.
import crypto from "node:crypto";
import store from "./store.js";

/** Client IP as reported by the platform proxy (Express `trust proxy` is set). */
export const clientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";

// IPs are hashed before being used as keys so raw addresses are never stored.
const keyFor = (name, id) =>
  `rl:${name}:${crypto.createHash("sha256").update(String(id)).digest("hex").slice(0, 24)}`;

export const hit = async (name, id, windowSeconds) => store.incr(keyFor(name, id), windowSeconds);
export const peek = async (name, id) => Number((await store.get(keyFor(name, id))) || 0);
export const retryAfter = async (name, id) => Math.max(1, await store.ttl(keyFor(name, id)));
export const reset = async (name, id) => store.del(keyFor(name, id));

/**
 * Express middleware factory.
 * @param {string} name     bucket name
 * @param {number} max      allowed requests per window
 * @param {number} windowSeconds
 * @param {(req) => string} [identify] defaults to client IP
 */
export const rateLimit = (name, max, windowSeconds, identify = clientIp) => async (req, res, next) => {
  try {
    const id = identify(req);
    const count = await hit(name, id, windowSeconds);
    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", Math.max(0, max - count));
    if (count > max) {
      res.setHeader("Retry-After", await retryAfter(name, id));
      return res.status(429).json({ success: false, error: "Too many requests. Please slow down." });
    }
    next();
  } catch (err) {
    // If the store is unreachable, fail closed for writes rather than run unmetered.
    next(Object.assign(new Error("Rate limiter unavailable"), { status: 503, cause: err }));
  }
};
