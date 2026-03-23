import { KB } from "../knowledge/kb.js";

// ─────────────────────────────────────────────────────────────────────────────
//  Response Builder — Generates warm, professional replies
//  Feels like Zubair — confident, helpful, not robotic
// ─────────────────────────────────────────────────────────────────────────────

const p = KB.platforms;

const allLinks = () =>
  `🔗 **Find Zubair here:**
• 💼 Upwork: ${p.upwork.url}
• 🎯 Fiverr: ${p.fiverr.url}
• 💻 GitHub: ${p.github.url}
• 🔗 LinkedIn: ${p.linkedin.url}
• 📋 Notion Portfolio: ${p.notion.url}
• 📸 Instagram: ${p.instagram.url}
• 📘 Facebook: ${p.facebook.url}
• 💬 WhatsApp: ${p.whatsapp.url}
• 🌐 Portfolio: ${p.portfolio.url}`;

export const buildResponse = (intent, message, sessionData) => {
  const lower = message.toLowerCase();

  switch (intent) {

    // ── GREETING ────────────────────────────────────────────────────────────
    case "greeting": {
      const greetings = [
        `Hey there! 👋 I'm **Zubair AI** — the personal assistant for Syed Zubair Hussain Shah, a Full Stack Developer, Mobile App Developer, AI/ML Engineer, and Video Editor based in Hyderabad, Pakistan.\n\nHow can I help you today? You can ask me about:\n• 💻 Services & Pricing\n• 📁 Projects & Portfolio\n• 📅 Booking a Call\n• 📄 Getting a Contract\n• 🔗 Finding Zubair on Upwork/Fiverr/GitHub`,
        `Salaam! 👋 Welcome! I'm Zubair's AI assistant. Zubair is a Full Stack & Mobile Developer with 3+ years of experience building real products for global clients.\n\nWhat brings you here today? Whether it's a project inquiry, pricing question, or just exploring — I've got you covered!`,
        `Hi! Great to meet you. 😊 I'm here to represent **Syed Zubair Hussain Shah** — Full Stack Dev, Mobile App Builder, AI/ML Engineer & Video Editor.\n\nAsk me anything — services, pricing, portfolio, or how to get started on a project!`,
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // ── WHO ARE YOU ──────────────────────────────────────────────────────────
    case "who_are_you": {
      return `I'm **Zubair AI** — the personal assistant for **Syed Zubair Hussain Shah** 👨‍💻

Zubair is a results-driven developer and co-founder of **Xovato Digital Agency**, based in Hyderabad, Pakistan. Here's a quick snapshot:

**🔧 What he does:**
• Full Stack Web Development (MERN, Next.js, TypeScript)
• Mobile App Development (React Native — iOS & Android)
• AI/ML Engineering (Python, Scikit-learn, Data Analysis)
• Video Editing (Premiere Pro, DaVinci Resolve, CapCut)
• UI/UX & Graphic Design (Figma, Photoshop)

**📊 Track record:**
• ${KB.stats.projectsDelivered} client projects delivered
• ${KB.stats.githubRepos} GitHub repos
• ${KB.stats.videosProduced} videos produced
• Kaggle ${KB.stats.kaggle}

**🌍 Serves clients in:** US, Australia, UK & globally

Want to see his work, check pricing, or book a call? Just ask!`;
    }

    // ── SKILLS ───────────────────────────────────────────────────────────────
    case "skills": {
      // Detect specific skill category from message
      if (/mobile|react native|android|ios/i.test(lower)) {
        return `**📱 Mobile Development Skills:**\n${KB.skills.mobile.map(s => `• ${s}`).join("\n")}\n\nZubair builds cross-platform iOS & Android apps using React Native — one codebase, both platforms, production-ready.`;
      }
      if (/ai|ml|machine|python|data|kaggle/i.test(lower)) {
        return `**🤖 AI/ML & Data Science Skills:**\n${KB.skills.aiml.map(s => `• ${s}`).join("\n")}\n\nZubair has completed ${KB.stats.dataNotebooks} data analysis notebooks and ranks in the ${KB.stats.kaggle} on Kaggle.`;
      }
      if (/video|edit|premiere|davinci|capcut/i.test(lower)) {
        return `**🎬 Video Editing Skills:**\n${KB.skills.videoEditing.map(s => `• ${s}`).join("\n")}\n\nZubair has produced ${KB.stats.videosProduced}+ promotional videos for clients across TikTok, Reels, YouTube, and more.`;
      }
      if (/design|figma|photoshop|graphic|ui|ux/i.test(lower)) {
        return `**🎨 Design Skills:**\n${KB.skills.graphicDesign.map(s => `• ${s}`).join("\n")}\n\nFrom wireframes to full brand identity — Zubair handles end-to-end design alongside development.`;
      }
      // Full skills overview
      return `**💪 Zubair's Full Skill Set:**

**Full Stack Web:**
${KB.skills.fullstack.map(s => `• ${s}`).join("\n")}

**Mobile (React Native):**
${KB.skills.mobile.map(s => `• ${s}`).join("\n")}

**AI/ML & Data Science:**
${KB.skills.aiml.map(s => `• ${s}`).join("\n")}

**Design:**
${[...KB.skills.frontend, ...KB.skills.graphicDesign].slice(0, 8).map(s => `• ${s}`).join("\n")}

**Video Editing:**
${KB.skills.videoEditing.slice(0, 5).map(s => `• ${s}`).join("\n")}

Want details on a specific area? Just ask — mobile, AI, design, video, or web!`;
    }

    // ── SERVICES ─────────────────────────────────────────────────────────────
    case "services": {
      return `**🛠️ Zubair's Services — Xovato Digital Agency:**

${KB.services.map(s => `**${s.name}** _(${s.tech})_\n  💰 ${s.price} | ⏱️ ${s.timeline}`).join("\n\n")}

All projects include proper documentation, source code handoff, and post-delivery support.

👉 Want a detailed quote? Ask about pricing or say **"I need a contract"** to get started!`;
    }

    // ── PRICING ──────────────────────────────────────────────────────────────
    case "pricing": {
      // Check if asking about specific service
      const serviceMatch = KB.services.find(s =>
        lower.includes(s.id) ||
        lower.includes(s.name.toLowerCase()) ||
        s.tech.toLowerCase().split(/[\s+/,]+/).some(t => t.length > 3 && lower.includes(t.toLowerCase()))
      );

      if (serviceMatch) {
        return `**💰 Pricing for ${serviceMatch.name}:**

• **Rate:** ${serviceMatch.price}
• **Timeline:** ${serviceMatch.timeline}
• **Tech:** ${serviceMatch.tech}

**What's included:**
${serviceMatch.includes.map(i => `✅ ${i}`).join("\n")}

Exact quote depends on your specific requirements. Want a formal proposal? Say **"generate a contract"** and I'll set one up!`;
      }

      return `**💰 Pricing Overview — Zubair / Xovato:**

${KB.services.map(s => `• **${s.name}:** ${s.price} _(${s.timeline})_`).join("\n")}

> All prices are starting estimates. Final quote comes after a quick scoping call.

**Payment terms:**
• 50% upfront deposit to start
• 50% on project delivery
• Payments via Upwork, PayPal, Wise, or bank transfer

Want a detailed quote for your project? Tell me what you need and I'll break it down!`;
    }

    // ── PORTFOLIO ────────────────────────────────────────────────────────────
    case "portfolio": {
      return `**📁 Featured Projects:**

${KB.projects.map(p => `**${p.name}** _(${p.tech})_\n  ${p.desc}${p.link ? `\n  🔗 ${p.link}` : ""}`).join("\n\n")}

**📊 Overall Stats:**
• ${KB.stats.projectsDelivered} client projects delivered
• ${KB.stats.githubRepos} GitHub repositories
• ${KB.stats.dataNotebooks} data analysis notebooks

🔗 **Full portfolio:** ${KB.platforms.portfolio.url}
📋 **Notion portfolio:** ${KB.notion.url}
💻 **GitHub:** ${KB.platforms.github.url}`;
    }

    // ── CONTACT ──────────────────────────────────────────────────────────────
    case "contact": {
      return `**📬 How to Reach Zubair:**

💬 **WhatsApp (fastest):** ${KB.identity.whatsapp}
🔗 **LinkedIn:** ${KB.platforms.linkedin.url}
💼 **Upwork:** ${KB.platforms.upwork.url}
🎯 **Fiverr:** ${KB.platforms.fiverr.url}
📸 **Instagram:** ${KB.platforms.instagram.url}

> 📧 Email is protected — use the **/api/contact** endpoint to send a message securely, or reach out directly on WhatsApp for the fastest response.

**Response time:** Within 24 hours (PKT business days)
**Available:** ${KB.identity.available}`;
    }

    // ── BOOK A CALL ──────────────────────────────────────────────────────────
    case "book_call": {
      return `**📅 Book a Call with Zubair:**

You can schedule a free 15-minute discovery call here:
👉 **${KB.identity.bookingLink}**

**What to expect:**
• Quick chat about your project requirements
• Timeline and budget discussion
• Tech stack recommendation
• No pressure, no obligation

**Zubair's availability:**
• 📍 Timezone: PKT (UTC+5)
• 🕘 Hours: ${KB.identity.available}

**Time conversion for you:**
• US East (EST): 11 PM – 11 AM (previous day)
• US Pacific (PST): 8 PM – 8 AM (previous day)
• Australia (AEST): 2 PM – 2 AM

> Can't find a slot? Message directly on WhatsApp: ${KB.identity.whatsapp}`;
    }

    // ── CONTRACT ─────────────────────────────────────────────────────────────
    case "contract": {
      return `**📄 Ready to Start a Project?**

To generate a formal proposal and contract, use this endpoint:

**POST /api/contract**
\`\`\`json
{
  "clientName": "Your Name",
  "clientEmail": "your@email.com",
  "projectTitle": "Project Name",
  "projectDescription": "What you need built...",
  "budget": "$500",
  "timeline": "2 weeks",
  "clientTimezone": "US/EST"
}
\`\`\`

A styled contract will be emailed to **both you and Zubair** instantly, including:

${KB.contractTerms.slice(0, 5).map(t => `✅ ${t}`).join("\n")}

> 💬 Prefer to discuss first? Book a call or message on WhatsApp: ${KB.identity.whatsapp}`;
    }

    // ── PLATFORMS ────────────────────────────────────────────────────────────
    case "platforms": {
      // Specific platform check
      if (/upwork/i.test(lower)) return `**💼 Upwork Profile:**\n${p.upwork.url}\n\n${p.upwork.note}\n\n🌟 Rising Talent badge. Available for fixed-price and hourly contracts.`;
      if (/fiverr/i.test(lower)) return `**🎯 Fiverr Profile:**\n${p.fiverr.url}\n\n${p.fiverr.note}`;
      if (/github/i.test(lower)) return `**💻 GitHub Profile:**\n${p.github.url}\n\n${p.github.note}\n\nExplore ${KB.stats.githubRepos} repositories spanning full stack, ML, and AI projects.`;
      if (/linkedin/i.test(lower)) return `**🔗 LinkedIn:**\n${p.linkedin.url}\n\n${p.linkedin.note}`;
      if (/notion/i.test(lower)) return `**📋 Notion Portfolio:**\n${KB.notion.url}\n\n${KB.notion.description}`;
      if (/instagram/i.test(lower)) return `**📸 Instagram:**\n${p.instagram.url}\n\n${p.instagram.note}`;
      if (/facebook/i.test(lower)) return `**📘 Facebook:**\n${p.facebook.url}\n\n${p.facebook.note}`;
      if (/whatsapp/i.test(lower)) return `**💬 WhatsApp (Direct):**\n${p.whatsapp.url}\n\nFastest way to reach Zubair for urgent project discussions.`;
      return allLinks();
    }

    // ── TIMEZONE ─────────────────────────────────────────────────────────────
    case "timezone": {
      const now = new Date();
      const pktTime = now.toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "full", timeStyle: "short" });
      return `**🕐 Timezone & Availability:**

**Zubair's timezone:** PKT — Pakistan Standard Time (UTC+5)
**Current PKT time:** ${pktTime}
**Available:** ${KB.identity.available}

**For your timezone:**
• 🇺🇸 US East (EST/UTC-5): PKT is 10 hours ahead
• 🇺🇸 US West (PST/UTC-8): PKT is 13 hours ahead
• 🇦🇺 Australia (AEST/UTC+10): PKT is 5 hours behind
• 🇬🇧 UK (GMT/UTC+0): PKT is 5 hours ahead
• 🇦🇪 UAE (GST/UTC+4): PKT is 1 hour ahead

> 9 AM PKT = 11 PM EST (previous day) = 8 PM PST (previous day) = 2 PM AEST

📅 Book a call: ${KB.identity.bookingLink}`;
    }

    // ── VIDEO EDITING ────────────────────────────────────────────────────────
    case "video_editing": {
      const svc = KB.services.find(s => s.id === "video");
      return `**🎬 Video Editing Services:**

${KB.skills.videoEditing.map(s => `• ${s}`).join("\n")}

**Pricing:** ${svc.price}
**Turnaround:** ${svc.timeline}

**What's included:**
${svc.includes.map(i => `✅ ${i}`).join("\n")}

Perfect for: TikTok, Instagram Reels, YouTube Shorts, long-form YouTube, and promotional brand videos.

Zubair has produced ${KB.stats.videosProduced}+ videos for clients. Want to see samples or get a quote?
💬 WhatsApp: ${KB.identity.whatsapp} | 🎯 Fiverr: ${p.fiverr.url}`;
    }

    // ── GRAPHIC DESIGN ───────────────────────────────────────────────────────
    case "graphic_design": {
      const svc = KB.services.find(s => s.id === "design");
      return `**🎨 UI/UX & Graphic Design Services:**

${KB.skills.graphicDesign.map(s => `• ${s}`).join("\n")}

**Pricing:** ${svc.price}
**Turnaround:** ${svc.timeline}

**What's included:**
${svc.includes.map(i => `✅ ${i}`).join("\n")}

From app wireframes to social media banners — Zubair handles design + development as a full package.
🔗 Portfolio: ${KB.platforms.portfolio.url}`;
    }

    // ── MOBILE ───────────────────────────────────────────────────────────────
    case "mobile": {
      const svc = KB.services.find(s => s.id === "mobile");
      return `**📱 Mobile App Development:**

${KB.skills.mobile.map(s => `• ${s}`).join("\n")}

**Pricing:** ${svc.price}
**Timeline:** ${svc.timeline}

**What's included:**
${svc.includes.map(i => `✅ ${i}`).join("\n")}

Zubair builds with **React Native** — one codebase for both iOS and Android, saving you time and cost.

Want a quote? Say **"generate a contract"** or book a call: ${KB.identity.bookingLink}`;
    }

    // ── AI/ML ────────────────────────────────────────────────────────────────
    case "aiml": {
      const svc = KB.services.find(s => s.id === "mlmodel");
      return `**🤖 AI/ML & Data Science:**

${KB.skills.aiml.map(s => `• ${s}`).join("\n")}

**Service pricing:** ${svc.price}
**Timeline:** ${svc.timeline}

**Track record:**
• ${KB.stats.dataNotebooks} data notebooks completed
• ${KB.stats.kaggle}
• Built Text-to-Image Generator, Salary Prediction model, IMDb analysis

**Also available:** AI API integration (custom chatbots, automation agents) for web/mobile apps.

GitHub: ${KB.platforms.github.url}`;
    }

    // ── NOTION ───────────────────────────────────────────────────────────────
    case "notion": {
      return `**📋 Notion Portfolio & Roadmap:**

${KB.notion.description}

👉 **View here:** ${KB.notion.url}

The Notion workspace includes:
• 📁 Full project portfolio with case studies
• 💼 Service packages and deliverables breakdown
• 🗺️ Project roadmap templates for clients
• 📊 Xovato agency pitch deck
• 📝 Proposal templates`;
    }

    // ── CERTIFICATIONS ───────────────────────────────────────────────────────
    case "certifications": {
      return `**🎓 Education & Certifications:**

**Education:**
${KB.education.degree}
${KB.education.institution}
Expected: ${KB.education.graduation}

**Certifications:**
${KB.certifications.map(c => `✅ ${c}`).join("\n")}

LinkedIn profile with full credentials: ${KB.platforms.linkedin.url}`;
    }

    // ── FAQ ───────────────────────────────────────────────────────────────────
    case "faq": {
      const match = KB.faq.find(f => f.q.some(q => lower.includes(q)));
      if (match) return `💡 **${match.a}**`;
      return `**❓ Frequently Asked Questions:**\n\n${KB.faq.map(f => `**Q: ${f.q[0]}**\nA: ${f.a}`).join("\n\n")}`;
    }

    // ── THANKS ────────────────────────────────────────────────────────────────
    case "thanks": {
      return `You're welcome! 😊 It was a pleasure chatting with you.\n\nWhenever you're ready to move forward with a project, feel free to:\n• 📅 Book a call: ${KB.identity.bookingLink}\n• 💬 WhatsApp: ${KB.identity.whatsapp}\n• 💼 Upwork: ${p.upwork.url}\n\nGood luck with your project! 🚀`;
    }

    // ── ERROR SEARCH (handled separately in controller) ──────────────────────
    case "error_search": {
      return null; // Signal to controller to use SERP API
    }

    // ── UNKNOWN ───────────────────────────────────────────────────────────────
    default: {
      return `I'm not sure I understood that fully, but here's what I can help you with:

• 💰 **Pricing** — "What are your rates?"
• 🛠️ **Services** — "What do you offer?"
• 📁 **Portfolio** — "Show me your projects"
• 📅 **Book a Call** — "I want to schedule a call"
• 📄 **Contract** — "I want to hire you"
• 🔗 **Find Zubair** — "Where can I find you online?"
• 🤖 **Tech Help** — "How do I fix [error]?"

Or message directly on WhatsApp for the fastest response: ${KB.identity.whatsapp}`;
    }
  }
};

export default buildResponse;
