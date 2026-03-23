// ─────────────────────────────────────────────────────────────────────────────
//  Intent Engine — Detects user intent from raw message text
//  No AI needed — pure pattern matching + keyword scoring
// ─────────────────────────────────────────────────────────────────────────────

const intents = [
  // Greetings
  {
    name: "greeting",
    patterns: [/^(hi|hello|hey|sup|yo|good\s*(morning|afternoon|evening|day)|howdy|greetings|salaam|salam)/i],
    keywords: ["hi", "hello", "hey", "greet"],
  },
  // Identity / Who are you
  {
    name: "who_are_you",
    patterns: [/who are you|what are you|tell me about (yourself|zubair)|introduce yourself|about you/i],
    keywords: ["who", "about", "introduce", "yourself", "zubair"],
  },
  // Skills
  {
    name: "skills",
    patterns: [/what (can you|do you|skills|tech|stack|know|build|develop|create)/i, /skills?|expertise|capable|experience with|proficient/i],
    keywords: ["skill", "tech", "stack", "build", "develop", "react", "node", "python", "mobile", "ai", "ml", "design", "video", "next", "mongodb", "typescript"],
  },
  // Services
  {
    name: "services",
    patterns: [/what (services|do you offer|can you do|do you provide)/i, /services?|offerings?|packages?|what.*build/i],
    keywords: ["service", "offer", "package", "provide", "available", "do you do", "can you make"],
  },
  // Pricing
  {
    name: "pricing",
    patterns: [/how much|what.*cost|price|pricing|rate|charge|budget|quote|estimate/i],
    keywords: ["price", "cost", "how much", "rate", "charge", "budget", "quote", "fee", "dollar", "usd"],
  },
  // Projects / Portfolio
  {
    name: "portfolio",
    patterns: [/portfolio|projects?|work|built|created|show me|examples?|previous/i],
    keywords: ["portfolio", "project", "work", "built", "example", "show", "demo", "past", "previous"],
  },
  // Contact
  {
    name: "contact",
    patterns: [/contact|reach|email|message|get in touch|talk to|speak to|connect/i],
    keywords: ["contact", "email", "reach", "message", "touch", "talk", "speak", "connect"],
  },
  // Book a call
  {
    name: "book_call",
    patterns: [/book (a )?(call|meeting|session|appointment|consult)|schedule (a )?(call|meeting)|set up (a )?(call|meeting)|calendly|discovery call/i],
    keywords: ["book", "call", "meeting", "schedule", "appointment", "consult", "calendly", "video call", "zoom"],
  },
  // Contract
  {
    name: "contract",
    patterns: [/contract|proposal|agreement|terms|hire|start (a )?project|work together|let's work/i],
    keywords: ["contract", "proposal", "agreement", "hire", "start", "work together", "terms", "deal"],
  },
  // Platforms (Upwork / Fiverr / GitHub / LinkedIn)
  {
    name: "platforms",
    patterns: [/upwork|fiverr|github|linkedin|notion|instagram|facebook|whatsapp|social|profile/i],
    keywords: ["upwork", "fiverr", "github", "linkedin", "notion", "instagram", "facebook", "whatsapp", "social", "profile", "find you"],
  },
  // Timezone / Availability
  {
    name: "timezone",
    patterns: [/timezone|time zone|available|availability|when.*work|hours|schedule|pkt|utc/i],
    keywords: ["timezone", "available", "hours", "schedule", "when", "pkt", "utc", "time"],
  },
  // Error search / tech help
  {
    name: "error_search",
    patterns: [/error|bug|issue|fix|problem|not working|crash|debug|how (to|do i)|solution|solve/i],
    keywords: ["error", "bug", "fix", "issue", "problem", "crash", "debug", "not working", "solution", "how to"],
  },
  // Video editing
  {
    name: "video_editing",
    patterns: [/video (edit|editing|production)|reel|tiktok|youtube|shorts|premiere|davinci|capcut|after effects/i],
    keywords: ["video", "edit", "reel", "tiktok", "youtube", "shorts", "premiere", "davinci", "capcut"],
  },
  // Graphic design
  {
    name: "graphic_design",
    patterns: [/graphic (design|designer)|logo|brand|ui|ux|figma|photoshop|design|thumbnail|banner/i],
    keywords: ["graphic", "design", "logo", "brand", "ui", "ux", "figma", "photoshop", "thumbnail", "banner"],
  },
  // Mobile app
  {
    name: "mobile",
    patterns: [/mobile (app|application|dev)|react native|android|ios|app (development|dev)/i],
    keywords: ["mobile", "app", "android", "ios", "react native", "application"],
  },
  // AI / ML
  {
    name: "aiml",
    patterns: [/ai|machine learning|ml|data (science|analysis|analyst)|python|model|prediction|kaggle/i],
    keywords: ["ai", "ml", "machine learning", "data", "python", "model", "prediction", "kaggle", "scikit"],
  },
  // Notion roadmap
  {
    name: "notion",
    patterns: [/notion|roadmap|proposal page|pitch deck|portfolio page/i],
    keywords: ["notion", "roadmap", "pitch", "proposal page"],
  },
  // Certifications / Education
  {
    name: "certifications",
    patterns: [/certif|education|degree|study|course|qualification|background/i],
    keywords: ["certif", "education", "degree", "course", "qualification", "background", "study"],
  },
  // FAQ
  {
    name: "faq",
    patterns: [/weekend|nda|confidential|revision|rush|urgent|maintenance|payment method|how.*pay/i],
    keywords: ["weekend", "nda", "confidential", "revision", "rush", "urgent", "maintenance", "payment"],
  },
  // Thanks / Goodbye
  {
    name: "thanks",
    patterns: [/thank|thanks|thank you|thx|appreciate|great|awesome|perfect|bye|goodbye|see you/i],
    keywords: ["thank", "thanks", "appreciate", "great", "awesome", "perfect", "bye", "goodbye"],
  },
];

/**
 * Detect intent from a user message
 * Returns the best matching intent name or "unknown"
 */
export const detectIntent = (message) => {
  const lower = message.toLowerCase().trim();

  // Check pattern matches first (higher confidence)
  for (const intent of intents) {
    for (const pattern of intent.patterns) {
      if (pattern.test(lower)) {
        return intent.name;
      }
    }
  }

  // Fallback: keyword scoring
  let bestIntent = null;
  let bestScore = 0;

  for (const intent of intents) {
    let score = 0;
    for (const kw of intent.keywords) {
      if (lower.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent.name;
    }
  }

  return bestScore > 0 ? bestIntent : "unknown";
};

export default detectIntent;
