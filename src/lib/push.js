// Web Push notifications for the admin inbox. Zubair's browser subscribes after
// he logs in and clicks "Allow notifications"; from then on new visitor
// messages reach him even when the inbox tab is closed.
import crypto from "node:crypto";
import webpush from "web-push";
import config from "../config.js";
import store from "./store.js";

const SUBS_KEY = "push:subs";
const MAX_SUBSCRIPTIONS = 10;

// Only real browser push services are accepted as endpoints. Without this an
// attacker with a session could make the server POST to arbitrary URLs (SSRF).
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
];

if (config.push.enabled) {
  webpush.setVapidDetails(config.push.subject, config.push.publicKey, config.push.privateKey);
}

const idFor = (endpoint) => crypto.createHash("sha256").update(endpoint).digest("hex").slice(0, 32);

export const isValidSubscription = (sub) => {
  try {
    if (!sub || typeof sub.endpoint !== "string" || sub.endpoint.length > 1000) return false;
    const url = new URL(sub.endpoint);
    if (url.protocol !== "https:" || !PUSH_HOSTS.some((re) => re.test(url.hostname))) return false;
    const { p256dh, auth } = sub.keys || {};
    return (
      typeof p256dh === "string" && p256dh.length <= 200 && typeof auth === "string" && auth.length <= 100
    );
  } catch {
    return false;
  }
};

export const saveSubscription = async (sub) => {
  if ((await store.hlen(SUBS_KEY)) >= MAX_SUBSCRIPTIONS) {
    // Drop the oldest so a new device can always register.
    const [oldest] = Object.keys(await store.hgetall(SUBS_KEY));
    if (oldest) await store.hdel(SUBS_KEY, oldest);
  }
  const clean = { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } };
  await store.hset(SUBS_KEY, idFor(sub.endpoint), JSON.stringify(clean));
};

export const removeSubscription = async (endpoint) => {
  if (typeof endpoint === "string") await store.hdel(SUBS_KEY, idFor(endpoint));
};

/** Send a notification to every registered admin device. Never throws. */
export const notifyAdmin = async ({ title, body, conversationId }) => {
  if (!config.push.enabled) return { sent: 0 };
  try {
    const subs = await store.hgetall(SUBS_KEY);
    const payload = JSON.stringify({
      title: String(title).slice(0, 80),
      body: String(body).slice(0, 160),
      conversationId,
    });
    const results = await Promise.allSettled(
      Object.entries(subs).map(async ([id, raw]) => {
        try {
          await webpush.sendNotification(JSON.parse(raw), payload, { TTL: 3600, urgency: "high", timeout: 5000 });
        } catch (err) {
          // 404/410 = the browser unsubscribed; forget the dead subscription.
          if (err?.statusCode === 404 || err?.statusCode === 410) await store.hdel(SUBS_KEY, id);
          throw err;
        }
      })
    );
    return { sent: results.filter((r) => r.status === "fulfilled").length };
  } catch {
    return { sent: 0 };
  }
};
