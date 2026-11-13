// End-to-end tests against the real Express app (in-memory store).
//   npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.ADMIN_USERNAME = "zubairhussain";
process.env.ALLOWED_ORIGINS = "https://zubairhussain.xyz";
process.env.UPSTASH_REDIS_REST_URL = "";
process.env.KV_REST_API_URL = "";
process.env.VAPID_PUBLIC_KEY = "";
process.env.EMAIL_USER = "";
process.env.SERP_API_KEY = "";

const PASSWORD = "correct horse battery staple";
const { hashPassword } = await import("../src/lib/auth.js");
process.env.ADMIN_PASSWORD_HASH = hashPassword(PASSWORD);

// config.js already loaded with an empty hash via auth.js → patch it in place.
const { config } = await import("../src/config.js");
config.admin.passwordHash = process.env.ADMIN_PASSWORD_HASH;
config.admin.enabled = true;

const { default: app } = await import("../src/index.js");
const { analyze } = await import("../src/engine/intentEngine.js");

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const call = async (path, { method = "GET", body, headers = {} } = {}) => {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* no body */
  }
  return { res, data };
};

const sameOrigin = () => ({ Origin: base });
const login = async (password = PASSWORD, username = "zubairhussain") =>
  call("/api/admin/login", { method: "POST", body: { username, password }, headers: sameOrigin() });
const cookieOf = (res) => res.headers.get("set-cookie").split(";")[0];

// ── Intent engine ───────────────────────────────────────────────────────────
test("intent engine: whole-word scoring, no substring false positives", () => {
  assert.equal(analyze("what is your email").intent, "contact"); // old engine → "aiml" (matched 'ai' in email)
  assert.equal(analyze("can you write html for me").intent === "aiml", false);
  assert.equal(analyze("how much for a landing page").intent, "pricing");
  assert.equal(analyze("I want to talk to a real person").intent, "handoff");
  assert.equal(analyze("book a call please").intent, "book_call");
  assert.equal(analyze("hello").intent, "greeting");
  assert.equal(analyze("hi, what are your prices?").intent, "pricing");
  assert.equal(analyze("do you build mobile apps").intent, "mobile");
  assert.equal(analyze("whats your pricng").intent, "pricing"); // typo tolerance
  assert.equal(analyze("yes", { lastIntent: "pricing" }).intent, "book_call"); // follow-up
  assert.equal(analyze("asdf qwer").intent, "unknown");
});

// ── Admin auth ──────────────────────────────────────────────────────────────
test("admin routes reject unauthenticated requests", async () => {
  assert.equal((await call("/api/admin/me")).res.status, 401);
  assert.equal((await call("/api/admin/conversations")).res.status, 401);
});

test("old data-leaking endpoints are gone", async () => {
  assert.equal((await call("/api/chat/stats")).res.status, 404);
  assert.equal((await call("/api/chat/history/anything")).res.status, 404);
});

test("login: wrong password and wrong username look identical", async () => {
  const a = await login("wrong-password");
  const b = await login(PASSWORD, "someone-else");
  assert.equal(a.res.status, 401);
  assert.equal(b.res.status, 401);
  assert.equal(a.data.error, b.data.error);
  assert.equal(a.res.headers.get("set-cookie"), null);
});

test("login is blocked cross-site (CSRF guard) and for non-JSON bodies", async () => {
  const evil = await call("/api/admin/login", {
    method: "POST",
    body: { username: "zubairhussain", password: PASSWORD },
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(evil.res.status, 403);

  const noOrigin = await call("/api/admin/login", { method: "POST", body: { username: "zubairhussain", password: PASSWORD } });
  assert.equal(noOrigin.res.status, 403);
});

test("forged / tampered / wrong-audience JWTs are rejected", async () => {
  const cookieName = config.admin.cookieName;
  const tryCookie = async (token) =>
    (await call("/api/admin/me", { headers: { Cookie: `${cookieName}=${token}` } })).res.status;

  // alg:none
  const none = [
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ sub: "zubairhussain", aud: "admin", iss: "zubair-agent" })).toString("base64url"),
    "",
  ].join(".");
  assert.equal(await tryCookie(none), 401);

  // signed with the wrong key
  const wrongKey = jwt.sign({ sub: "zubairhussain" }, "x".repeat(40), { audience: "admin", issuer: "zubair-agent" });
  assert.equal(await tryCookie(wrongKey), 401);

  // a VISITOR token must never work as an admin session
  const visitor = jwt.sign({ sub: "zubairhussain" }, config.jwt.secret, { audience: "visitor", issuer: "zubair-agent" });
  assert.equal(await tryCookie(visitor), 401);

  // right key + audience but minted before a password change
  const stale = jwt.sign({ sub: "zubairhussain", pwv: "old" }, config.jwt.secret, { audience: "admin", issuer: "zubair-agent" });
  assert.equal(await tryCookie(stale), 401);
});

// ── Full chat flow ──────────────────────────────────────────────────────────
test("visitor ↔ AI ↔ Zubair share one thread; presence and AI pause work", async () => {
  const site = { Origin: "https://zubairhussain.xyz" };

  // Before Zubair logs in he is offline.
  const status0 = await call("/api/live/status", { headers: site });
  assert.equal(status0.data.status.online, false);
  assert.equal(status0.data.status.replyTime, "within 1 hour");
  assert.equal(status0.res.headers.get("access-control-allow-origin"), "https://zubairhussain.xyz");

  // Visitor starts a chat → AI answers instantly.
  const start = await call("/api/live/conversations", {
    method: "POST",
    body: { text: "How much for a landing page?", page: "/" },
    headers: site,
  });
  assert.equal(start.res.status, 201);
  assert.deepEqual(start.data.messages.map((m) => m.author), ["visitor", "ai"]);
  const auth = { ...site, Authorization: `Bearer ${start.data.token}` };
  const conversationId = start.data.conversationId;

  // No token / garbage token → 401.
  assert.equal((await call("/api/live/messages", { headers: site })).res.status, 401);
  assert.equal((await call("/api/live/messages", { headers: { ...site, Authorization: "Bearer nope" } })).res.status, 401);

  // Markup is stored as inert text (clients render with textContent).
  const xss = await call("/api/live/messages", { method: "POST", body: { text: "<img src=x onerror=alert(1)> talk to zubair" }, headers: auth });
  assert.equal(xss.data.messages[0].text, "<img src=x onerror=alert(1)> talk to zubair");
  assert.equal(xss.data.handoff, true); // switched straight to Zubair
  assert.equal(xss.data.messages.length, 1); // no AI reply after a handoff
  assert.equal(xss.data.aiActive, false);

  // Identify with a bad email is refused, a good one accepted.
  assert.equal((await call("/api/live/identify", { method: "POST", body: { email: "not-an-email" }, headers: auth })).res.status, 400);
  assert.equal((await call("/api/live/identify", { method: "POST", body: { name: "Sara", email: "sara@example.com" }, headers: auth })).res.status, 200);

  // Zubair logs in.
  const session = await login();
  assert.equal(session.res.status, 200);
  const setCookie = session.res.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Strict/);
  const adminHeaders = { Cookie: cookieOf(session.res), ...sameOrigin() };

  const list = await call("/api/admin/conversations?active=1", { headers: adminHeaders });
  const row = list.data.conversations.find((c) => c.id === conversationId);
  assert.equal(row.unread, 2);
  assert.equal(row.aiEnabled, false);
  assert.equal(row.handoff, true);
  assert.equal(row.name, "Sara");

  // Visitors now see him online.
  assert.equal((await call("/api/live/status", { headers: site })).data.status.online, true);

  // Opening the thread marks it read.
  const thread = await call(`/api/admin/conversations/${conversationId}`, { headers: adminHeaders });
  assert.equal(thread.data.messages.length, 3);
  assert.equal(thread.data.conversation.unread, 0);

  // Zubair replies → visitor receives it via polling.
  const reply = await call(`/api/admin/conversations/${conversationId}/messages`, {
    method: "POST", body: { text: "Hi Sara, Zubair here!" }, headers: adminHeaders,
  });
  assert.equal(reply.res.status, 201);
  const poll = await call(`/api/live/messages?after=${thread.data.messages.at(-1).id}`, { headers: auth });
  assert.deepEqual(poll.data.messages.map((m) => [m.author, m.text]), [["zubair", "Hi Sara, Zubair here!"]]);
  assert.equal(poll.data.aiActive, false);

  // While Zubair is active the AI stays quiet.
  const next = await call("/api/live/messages", { method: "POST", body: { text: "Great, thanks" }, headers: auth });
  assert.deepEqual(next.data.messages.map((m) => m.author), ["visitor"]);

  // A visitor token is scoped to its own conversation — it cannot reach the admin API.
  assert.equal((await call(`/api/admin/conversations/${conversationId}`, { headers: auth })).res.status, 401);

  // Bad ids never reach the store.
  assert.equal((await call("/api/admin/conversations/..%2F..%2Fadmin:seen", { headers: adminHeaders })).res.status, 400);

  // Push: only real push-service endpoints are accepted (SSRF guard) — and push is off here anyway.
  const sub = await call("/api/admin/push/subscribe", {
    method: "POST", headers: adminHeaders,
    body: { subscription: { endpoint: "https://169.254.169.254/latest/meta-data", keys: { p256dh: "a", auth: "b" } } },
  });
  assert.ok([400, 503].includes(sub.res.status));

  // Delete, then the visitor's token points at nothing.
  assert.equal((await call(`/api/admin/conversations/${conversationId}`, { method: "DELETE", headers: adminHeaders })).res.status, 200);
  const gone = await call("/api/live/messages", { headers: auth });
  assert.equal(gone.res.status, 404);
  assert.equal(gone.data.code, "CONVERSATION_GONE");

  // Logout clears the cookie.
  const out = await call("/api/admin/logout", { method: "POST", body: {}, headers: adminHeaders });
  assert.match(out.res.headers.get("set-cookie"), /Expires=Thu, 01 Jan 1970/);
});

test("visitor can pick who they talk to by tapping an avatar", async () => {
  const site = { Origin: "https://zubairhussain.xyz" };
  const start = await call("/api/live/conversations", { method: "POST", body: { text: "hello", agent: "zubair" }, headers: site });
  assert.deepEqual(start.data.messages.map((m) => m.author), ["visitor"]); // human mode: AI silent
  const auth = { ...site, Authorization: `Bearer ${start.data.token}` };

  const toAi = await call("/api/live/agent", { method: "POST", body: { agent: "ai" }, headers: auth });
  assert.equal(toAi.res.status, 200);
  const next = await call("/api/live/messages", { method: "POST", body: { text: "pricing?" }, headers: auth });
  assert.deepEqual(next.data.messages.map((m) => m.author), ["visitor", "ai"]);

  assert.equal((await call("/api/live/agent", { method: "POST", body: { agent: "root" }, headers: auth })).res.status, 400);
  assert.equal((await call("/api/live/agent", { method: "POST", body: { agent: "ai" }, headers: site })).res.status, 401);
});

// ── Abuse controls ──────────────────────────────────────────────────────────
test("foreign origins are refused; oversized and malformed bodies are rejected", async () => {
  const evil = await call("/api/chat", { method: "POST", body: { message: "hi" }, headers: { Origin: "https://evil.example" } });
  assert.equal(evil.res.status, 403);

  const big = await call("/api/chat", { method: "POST", body: { message: "x".repeat(40_000) } });
  assert.equal(big.res.status, 413);

  const res = await fetch(base + "/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{not json" });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Invalid request body."); // no parser internals leaked

  const typed = await call("/api/chat", { method: "POST", body: { message: { $ne: null } } });
  assert.equal(typed.res.status, 400);
});

test("security headers are present", async () => {
  const { res } = await call("/admin");
  assert.match(res.headers.get("content-security-policy"), /script-src 'self'/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.equal(res.headers.get("x-powered-by"), null);
});

test("SEO: robots, sitemap, noindex on private routes, demo meta", async () => {
  const robots = await fetch(base + "/robots.txt").then((r) => r.text());
  assert.match(robots, /Disallow: \/api\//);
  assert.match(robots, /Disallow: \/admin/);
  assert.match(robots, /Sitemap: .*\/sitemap\.xml/);
  assert.match(await fetch(base + "/sitemap.xml").then((r) => r.text()), /<loc>.*\/demo<\/loc>/);
  assert.equal((await fetch(base + "/api/live/status")).headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal((await fetch(base + "/admin")).headers.get("x-robots-tag"), "noindex, nofollow");
  const root = await fetch(base + "/", { redirect: "manual" });
  assert.equal(root.status, 301);
  const demo = await fetch(base + "/demo").then((r) => r.text());
  assert.match(demo, /<link rel="canonical"/);
  assert.match(demo, /"@type":"SoftwareApplication"/);
});

test("login locks out after repeated failures (runs last)", async () => {
  let last;
  for (let i = 0; i < 6; i++) last = await login("wrong-" + i);
  assert.equal(last.res.status, 429);
  assert.ok(Number(last.res.headers.get("retry-after")) > 0);
  // Even the CORRECT password is refused while locked.
  assert.equal((await login()).res.status, 429);
});
