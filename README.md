<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f3460,100:e94560&height=200&section=header&text=Zubair%20AI%20Agent&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Personal%20AI%20Agent%20%E2%80%94%20Xovato%20Digital%20Agency&descAlignY=58&descSize=18" width="100%"/>

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![Vercel](https://img.shields.io/badge/Vercel-Ready-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com)
[![License](https://img.shields.io/badge/License-MIT-e94560?style=for-the-badge)](LICENSE)
[![Made in Pakistan](https://img.shields.io/badge/Made%20in-Pakistan%20🇵🇰-01411C?style=for-the-badge)](https://github.com/Zubair-hussain)

<br/>

> **A production-grade personal AI agent — no API keys, no quotas, no billing. Just pure custom logic trained on one developer's entire professional profile.**

<br/>

[🚀 Live Demo](https://zubair-hussain-shah.vercel.app) &nbsp;·&nbsp;
[💼 Upwork](https://www.upwork.com/freelancers/~01090ac35dc8078823?mp_source=share) &nbsp;·&nbsp;
[🎯 Fiverr](https://www.fiverr.com/s/NNGDEaQ) &nbsp;·&nbsp;
[📓 Notion](https://www.notion.so/Zubair-Hussain-Full-Stack-Developer-3278c7707d0180b784a2d7807e6157c4?source=copy_link) &nbsp;·&nbsp;
[💬 WhatsApp](https://wa.me/+923708729117)

</div>

---

## 🤔 Why This Exists

Most developer portfolios are static — they show work but can't *talk* about it.

This project is different. It's a **REST API that represents me** — answers questions about my skills, generates client contracts, books discovery calls, searches for tech solutions, and routes people to the right place — all without a single external AI API call.

**No Gemini. No OpenAI. No HuggingFace. Zero quota burnouts.**

Built for my portfolio at [Xovato](https://zubair-hussain-shah.vercel.app) — and open-sourced so other freelancers can fork it for themselves.

---

## ✨ Features

| Feature | Description |
|---|---|
| 💬 **Smart Chat** | 25-intent engine — greets, answers, guides, sells |
| 📄 **Contract Generator** | Full proposal with T&Cs emailed to client + developer |
| 📅 **Book a Call** | Returns Calendly link + live timezone conversions |
| 🔍 **Live Search** | Google search via SerpApi for errors & tech Q&A |
| 📧 **Contact Guard** | Inquiry forwarded securely — email never exposed |
| 🌍 **Timezone Tool** | PKT → EST, PST, AEST, GMT and more |
| 👤 **Profile API** | Full public profile, pricing, skills, projects |
| 🛡️ **Rate Limiting** | Per-endpoint abuse protection |
| ⚡ **Vercel Ready** | Deploy in one command |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Zubair AI Agent v2                  │
│                                                      │
│  POST /api/chat                                      │
│       │                                              │
│       ▼                                              │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Intent Engine│───▶│    Knowledge Base         │   │
│  │ (25 intents) │    │  src/knowledge/index.js  │   │
│  └──────────────┘    └──────────────────────────┘   │
│       │                                              │
│       ▼                                              │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │  Response    │    │  Action Handlers          │   │
│  │  Builder     │───▶│  Contract / Email / SERP  │   │
│  └──────────────┘    └──────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**No external AI API** — intent detection runs on pure regex + keyword matching. Blazing fast, always available, zero cost.

---

## 📁 Project Structure

```
zubair-ai-agent/
├── src/
│   ├── index.js                 # Express server entry
│   ├── knowledge/
│   │   └── index.js             # ← All profile data lives here
│   ├── engine/
│   │   ├── intentEngine.js      # 25-intent detection system
│   │   └── responseBuilder.js   # Human-like response generator
│   ├── handlers/
│   │   ├── contractHandler.js   # Contract generation + HTML email
│   │   ├── emailService.js      # Nodemailer email delivery
│   │   └── searchHandler.js     # SerpApi live search
│   ├── controllers/
│   │   ├── chatController.js    # Chat + session management
│   │   └── index.js             # Contract, contact, profile, search
│   ├── middleware/
│   │   └── index.js             # Rate limiting + validation + errors
│   ├── routes/
│   │   └── index.js             # All API routes
│   └── utils/
│       └── timezone.js          # PKT conversions
├── vercel.json                  # One-command Vercel deploy
├── .env.example                 # Environment template
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Zubair-hussain/zubair-ai-agent.git
cd zubair-ai-agent
npm install
```

### 2. Configure

```bash
cp .env.example .env
```

```env
PORT=5000
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_TO=your@gmail.com
SERP_API_KEY=your_serpapi_key   # optional — free at serpapi.com
ALLOWED_ORIGINS=*
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App Passwords

### 3. Run

```bash
npm run dev    # development with auto-reload
npm start      # production
```

✅ Server starts at `http://localhost:5000`

---

## 🔌 API Reference

### Chat — `POST /api/chat`

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "optional-for-memory"}'
```

**Try these messages:**
```
"Hello"                          → greeting + menu
"What can you build?"            → full skills overview
"Show me pricing"                → pricing table with timelines
"Tell me about Upwork"           → Upwork profile + badge
"Show me projects"               → portfolio + GitHub links
"Book a call"                    → Calendly + timezone windows
"How do I contact Zubair?"       → all contact links
"search React useEffect bug"     → live Google search
"I want to hire you"             → hire flow + all platforms
"Generate a contract"            → guided to contract endpoint
"Tell me about Xovato"           → agency overview
"What is Notion?"                → Notion portfolio link
```

**Response:**
```json
{
  "success": true,
  "sessionId": "uuid",
  "intent": "greeting",
  "reply": "Hey there! 👋 Welcome to Zubair's AI assistant...",
  "timestamp": "2026-03-23T10:00:00.000Z"
}
```

---

### Generate Contract — `POST /api/contract`

```bash
curl -X POST http://localhost:5000/api/contract \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "John Smith",
    "clientEmail": "john@company.com",
    "projectTitle": "E-commerce Platform",
    "projectDescription": "Full MERN stack e-commerce with admin panel, payments, and inventory.",
    "budget": "$1500",
    "timeline": "3 weeks",
    "clientTimezone": "US/EST"
  }'
```

Sends a styled HTML proposal email to **both** Zubair and the client with full T&Cs.

---

### Contact — `POST /api/contact`

```bash
curl -X POST http://localhost:5000/api/contact \
  -H "Content-Type: application/json" \
  -d '{
    "senderName": "Sarah",
    "senderEmail": "sarah@startup.com",
    "subject": "Need a mobile app",
    "message": "Hi, I need a React Native app for my business...",
    "timezone": "AU/AEST"
  }'
```

Zubair's email is **never exposed** — all inquiries are forwarded securely.

---

### Search — `POST /api/search`

```bash
curl -X POST http://localhost:5000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "React useState not updating fix"}'
```

---

### Profile Endpoints

```bash
GET /api/profile           # Full public profile
GET /api/profile/pricing   # Services & rates
GET /api/profile/timezone  # PKT time + all conversions
GET /api/chat/stats        # Active sessions
GET /api/chat/history/:id  # Conversation history
DELETE /api/chat/:id       # Clear a session
```

---

## 🛡️ Rate Limits

| Endpoint | Limit |
|---|---|
| Global | 60 req / min |
| `/api/chat` | 30 msg / min |
| `/api/contact` | 5 req / 10 min |
| `/api/contract` | 3 req / hour |
| `/api/search` | 10 req / min |

---

## ☁️ Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Add environment variables in the Vercel dashboard:
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_TO`
- `SERP_API_KEY` *(optional)*

Done. Your agent is live. 🚀

---

## 🔧 Customize for Yourself

All profile data lives in **one file**: `src/knowledge/index.js`

Update it to change:
- Your name, links, skills, pricing
- Projects and certifications
- Booking link (Calendly)
- Contract terms
- Agency details

No other files need changing.

---

## 🧠 Intents Supported

```
greeting       who_are_you    skills         fullstack
mobile         aiml           video_design   pricing
projects       hire           book_call      contract
contact        upwork         fiverr         github
linkedin       notion         timezone       certifications
whatsapp       search         thanks         goodbye
unknown
```

---

## 🤝 Connect

<div align="center">

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/syed-zubair-hussain-shah-491294376)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Zubair-hussain)
[![Upwork](https://img.shields.io/badge/Upwork-Hire%20Me-6FDA44?style=for-the-badge&logo=upwork&logoColor=white)](https://www.upwork.com/freelancers/~01090ac35dc8078823?mp_source=share)
[![Fiverr](https://img.shields.io/badge/Fiverr-Order-1DBF73?style=for-the-badge&logo=fiverr&logoColor=white)](https://www.fiverr.com/s/NNGDEaQ)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Chat-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/+923708729117)

</div>

---

<div align="center">

**If this helped you, drop a ⭐ — it means a lot from Pakistan 🇵🇰**

*Built by [Syed Zubair Hussain Shah](https://zubair-hussain-shah.vercel.app) — Xovato Digital Agency*

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:e94560,100:0f3460&height=100&section=footer" width="100%"/>

</div>"# Zubair-Agent" 
