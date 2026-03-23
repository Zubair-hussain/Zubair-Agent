import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { globalLimiter, errorHandler, notFound } from "./middleware/index.js";
import routes from "./routes/index.js";
import { getPKTNow } from "./utils/timezone.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS === "*"
    ? "*"
    : process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()),
  methods: ["GET", "POST", "DELETE"],
}));
app.use(express.json({ limit: "50kb" }));
app.use(globalLimiter);

// ── Logger ────────────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${getPKTNow()}] ${req.method} ${req.path}`);
  next();
});

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.redirect("/api"));

app.get("/api", (_req, res) => {
  res.json({
    success: true,
    name: "Zubair AI Agent",
    version: "2.0.0",
    description: "Custom AI agent for Syed Zubair Hussain Shah — Xovato Digital Agency",
    serverTime: getPKTNow() + " (PKT)",
    noExternalAI: true,
    endpoints: {
      "POST /api/chat":                  "Chat with the agent. Body: { message, sessionId? }",
      "GET  /api/chat/history/:sid":     "Get conversation history for a session",
      "GET  /api/chat/stats":            "Active session count",
      "DELETE /api/chat/:sid":           "Clear a session",
      "POST /api/contract":             "Generate project contract. Body: { clientName, clientEmail, projectTitle, projectDescription, budget, timeline, clientTimezone? }",
      "POST /api/contact":              "Send inquiry to Zubair. Body: { senderName, senderEmail, subject, message, timezone? }",
      "POST /api/search":               "Search Google via SERP. Body: { query }",
      "GET  /api/profile":              "Full public profile",
      "GET  /api/profile/pricing":      "Services & pricing",
      "GET  /api/profile/timezone":     "PKT time + all timezone conversions",
    },
    links: {
      portfolio:  "https://zubair-hussain-shah.vercel.app",
      github:     "https://github.com/Zubair-hussain",
      linkedin:   "https://www.linkedin.com/in/syed-zubair-hussain-shah-491294376",
      notion:     "https://www.notion.so/Zubair-Hussain-Full-Stack-Developer-3278c7707d0180b784a2d7807e6157c4",
      whatsapp:   "https://wa.me/923110302103",
    },
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 & Error ───────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log("╔══════════════════════════════════════════════════════╗");
    console.log("║        Zubair AI Agent v2.0 — Started               ║");
    console.log(`║  Port     : ${PORT}                                    ║`);
    console.log(`║  Time     : ${getPKTNow().slice(0, 22)} (PKT)   ║`);
    console.log("║  Engine   : Custom (no external AI API)             ║");
    console.log("║  Author   : Syed Zubair Hussain Shah — Xovato       ║");
    console.log("╚══════════════════════════════════════════════════════╝");
  });
}

export default app;
