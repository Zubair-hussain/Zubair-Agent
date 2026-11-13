import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import helmet from "helmet";
import config from "./config.js";
import routes from "./routes/index.js";

const app = express();
const adminDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "admin");

// Behind exactly one proxy hop (Vercel) — makes req.ip the real client address
// instead of a spoofable X-Forwarded-For value.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'none'"],
        scriptSrc: ["'self'"], // no inline scripts anywhere
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        workerSrc: ["'self'"],
        manifestSrc: ["'self'"],
        formAction: ["'self'"],
        baseUri: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }, // the API is called from the website
    referrerPolicy: { policy: "no-referrer" },
    hsts: config.isProd ? { maxAge: 31536000, includeSubDomains: true } : false,
  })
);

// Small JSON bodies only; anything bigger is rejected before it is parsed.
app.use(express.json({ limit: "16kb", type: "application/json" }));

// API responses and the private inbox must never appear in search results.
app.use(["/api", "/admin"], (_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});


// ── Admin inbox (static, same origin as the API so the session cookie is first-party)
app.get("/admin", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(adminDir, "index.html"));
});
app.get("/admin/sw.js", (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Service-Worker-Allowed", "/admin");
  res.sendFile(path.join(adminDir, "sw.js"));
});
app.use(
  "/admin",
  express.static(adminDir, { index: false, dotfiles: "deny", maxAge: config.isProd ? "10m" : 0 })
);

// ── SEO: only the public demo page is meant for search engines ───────────────
const publicOrigin = (req) => `${config.isProd ? "https" : req.protocol}://${req.get("host")}`;

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").setHeader("Cache-Control", "public, max-age=3600");
  res.send(
    ["User-agent: *", "Allow: /demo", "Allow: /widget/", "Disallow: /api/", "Disallow: /admin", "", `Sitemap: ${publicOrigin(req)}/sitemap.xml`, ""].join("\n")
  );
});

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml").setHeader("Cache-Control", "public, max-age=3600");
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${publicOrigin(req)}/demo</loc><changefreq>weekly</changefreq><priority>1.0</priority></url></urlset>
`
  );
});

// ── Embeddable widget + live demo ─────────────────────────────────────────────
const widgetDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "widget");
app.get("/demo", (_req, res) => res.sendFile(path.join(widgetDir, "demo.html")));
app.use(
  "/widget",
  (_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*"); // static, public, no credentials
    next();
  },
  express.static(widgetDir, { index: false, dotfiles: "deny", maxAge: config.isProd ? "1h" : 0 })
);

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.redirect(301, "/demo"));

app.get("/api", (_req, res) => {
  res.json({
    success: true,
    name: "Zubair AI Agent",
    version: "3.0.0",
    description: "AI agent + live chat backend for Syed Zubair Hussain Shah — Xovato Digital Agency",
    endpoints: {
      "GET  /api/live/status": "Is Zubair online + typical reply time",
      "POST /api/live/conversations": "Start a live chat. Body: { text, page? } → { token, messages }",
      "GET  /api/live/messages?after=": "Poll a conversation (Bearer visitor token)",
      "POST /api/live/messages": "Send a message (Bearer visitor token). Body: { text }",
      "POST /api/live/identify": "Attach name/email (Bearer visitor token)",
      "POST /api/chat": "One-shot AI answer. Body: { message }",
      "POST /api/contract": "Generate a project contract",
      "POST /api/contact": "Send an inquiry to Zubair",
      "POST /api/search": "Search Google via SERP. Body: { query }",
      "GET  /api/profile": "Full public profile",
      "GET  /api/profile/pricing": "Services & pricing",
      "GET  /api/profile/timezone": "PKT time + timezone conversions",
    },
  });
});

// ── API ───────────────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 & errors ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found.", hint: "See GET /api for available endpoints." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  // Details go to the server log only — never to the client.
  if (status >= 500) console.error(`[ERROR] ${new Date().toISOString()}`, err);
  const message =
    status === 400 ? "Invalid request body."
    : status === 413 ? "Request body too large."
    : status === 503 ? "Service temporarily unavailable."
    : status < 500 ? "Request rejected."
    : "Internal server error.";
  res.status(status).json({ success: false, error: message });
});

// ── Start (skipped on Vercel, where the app is imported as a handler) ─────────
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  app.listen(config.port, () => {
    console.log(`Zubair AI Agent v3 listening on http://localhost:${config.port}`);
    console.log(`  Admin inbox : http://localhost:${config.port}/admin (${config.admin.enabled ? "login enabled" : "DISABLED — set JWT_SECRET + ADMIN_PASSWORD_HASH"})`);
    console.log(`  Storage     : ${config.store.persistent ? "Upstash Redis" : "in-memory (dev only — data is lost on restart)"}`);
    console.log(`  Web push    : ${config.push.enabled ? "enabled" : "disabled — set VAPID keys"}`);
  });
}

export default app;
