// ─────────────────────────────────────────────────────────────────────────────
//  Central configuration. Every secret comes from the environment — nothing
//  sensitive is ever hard-coded, and features that need a secret FAIL CLOSED
//  (stay disabled) when that secret is missing or too weak.
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";

const env = process.env;
const isProd = env.NODE_ENV === "production" || Boolean(env.VERCEL);

const list = (value) =>
  (value || "")
    .split(",")
    .map((v) => v.trim().replace(/\/$/, ""))
    .filter(Boolean);

const jwtSecret = env.JWT_SECRET || "";
const passwordHash = env.ADMIN_PASSWORD_HASH || "";

// "*" is never honoured in production: an open CORS policy would let any site
// drive the chat API from a visitor's browser.
const rawOrigins = list(env.ALLOWED_ORIGINS).filter((o) => o !== "*");
const devOrigins = ["http://localhost:3000", "http://127.0.0.1:3000"];

export const config = {
  isProd,
  port: Number(env.PORT) || 5000,

  allowedOrigins: isProd ? rawOrigins : [...new Set([...rawOrigins, ...devOrigins])],

  admin: {
    username: (env.ADMIN_USERNAME || "zubairhussain").toLowerCase(),
    passwordHash,
    // Login only works when BOTH a strong signing secret and a password hash exist.
    enabled: jwtSecret.length >= 32 && passwordHash.startsWith("scrypt$"),
    sessionHours: 12,
    cookieName: isProd ? "__Host-zh_admin" : "zh_admin",
  },

  jwt: {
    secret: jwtSecret,
    ready: jwtSecret.length >= 32,
    issuer: "zubair-agent",
    visitorDays: 30,
  },

  store: {
    // Supabase (free plan) — preferred. Server-side secret key only.
    supabaseUrl: (env.SUPABASE_URL || "").replace(/\/+$/, ""),
    supabaseKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY || "",
    // Upstash Redis — optional alternative.
    url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || "",
    token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || "",
  },

  push: {
    publicKey: env.VAPID_PUBLIC_KEY || "",
    privateKey: env.VAPID_PRIVATE_KEY || "",
    subject: env.VAPID_SUBJECT || "mailto:admin@example.com",
  },

  email: {
    user: env.EMAIL_USER || "",
    pass: env.EMAIL_PASS || "",
    to: env.EMAIL_TO || env.EMAIL_USER || "",
  },

  serpApiKey: env.SERP_API_KEY || "",

  chat: {
    replyTimeLabel: env.REPLY_TIME_LABEL || "within 1 hour",
    onlineWindowMs: 90 * 1000, // admin counts as "online" if seen this recently
    aiPauseAfterHumanMs: 10 * 60 * 1000, // AI stays quiet after Zubair replies
    maxMessageLength: 2000,
    maxMessagesPerConversation: 400,
    conversationTtlSeconds: 90 * 24 * 60 * 60,
  },
};

config.push.enabled = Boolean(config.push.publicKey && config.push.privateKey);
config.email.enabled = Boolean(config.email.user && config.email.pass);
config.store.supabase = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(config.store.supabaseUrl) && Boolean(config.store.supabaseKey);
config.store.upstash = Boolean(config.store.url && config.store.token);
config.store.persistent = config.store.supabase || config.store.upstash;
config.store.kind = config.store.supabase ? "Supabase" : config.store.upstash ? "Upstash Redis" : "in-memory";

export default config;
