// ─────────────────────────────────────────────────────────────────────────────
//  Intent Engine v3 — weighted scoring instead of "first regex wins".
//
//  Why the rewrite: the old engine returned the FIRST intent whose pattern
//  matched, and patterns such as /ai|ml/ had no word boundaries — so "email",
//  "html" or "available" were all classified as AI/ML. Now every intent is
//  scored (phrases > keywords, whole words only, small typo tolerance) and the
//  best score wins. Still zero external AI calls, still sub-millisecond.
// ─────────────────────────────────────────────────────────────────────────────

const PHRASE_WEIGHT = 3;
const KEYWORD_WEIGHT = 1;

// `phrases` are strong signals; `keywords` are weak ones. All are matched on
// word boundaries against a normalised (lower-cased, punctuation-free) message.
const INTENTS = [
  {
    name: "handoff",
    phrases: [
      "talk to zubair", "speak to zubair", "chat with zubair", "real person", "real human", "human agent",
      "talk to a human", "speak to a human", "talk to someone", "live agent", "live chat", "talk to human",
      "connect me to zubair", "is zubair there", "is zubair online", "talk to him", "speak with zubair",
      "talk to the owner", "not a bot", "actual person",
    ],
    keywords: ["human", "operator"],
  },
  {
    name: "book_call",
    phrases: [
      "book a call", "book call", "book a meeting", "schedule a call", "schedule a meeting", "set up a call",
      "discovery call", "video call", "have a call", "jump on a call", "get on a call", "book an appointment",
    ],
    keywords: ["calendly", "appointment", "meeting", "schedule", "zoom", "consultation", "book"],
  },
  {
    name: "pricing",
    phrases: ["how much", "what does it cost", "what do you charge", "your rates", "price list", "hourly rate"],
    keywords: ["price", "prices", "pricing", "cost", "costs", "rate", "rates", "charge", "budget", "quote", "estimate", "fee", "fees", "cheap", "expensive", "usd"],
  },
  {
    name: "contract",
    phrases: [
      "generate a contract", "need a contract", "want to hire", "hire you", "hire zubair", "hire him",
      "start a project", "work together", "work with you", "work with zubair", "get started", "send a proposal",
    ],
    keywords: ["contract", "proposal", "agreement", "hire", "hiring", "onboard"],
  },
  {
    name: "contact",
    phrases: ["get in touch", "reach out", "how do i contact", "how can i contact", "contact details", "phone number"],
    keywords: ["contact", "email", "mail", "reach", "phone", "number"],
  },
  {
    name: "platforms",
    phrases: ["where can i find", "social media", "find you online"],
    keywords: ["upwork", "fiverr", "github", "linkedin", "instagram", "facebook", "whatsapp", "socials", "profile", "profiles"],
  },
  {
    name: "notion",
    phrases: ["pitch deck", "proposal page", "notion portfolio"],
    keywords: ["notion", "roadmap"],
  },
  {
    name: "portfolio",
    phrases: ["show me your work", "show me projects", "recent projects", "past work", "previous work", "case studies", "what have you built"],
    keywords: ["portfolio", "project", "projects", "examples", "demo", "demos", "showcase", "built"],
  },
  {
    name: "mobile",
    phrases: ["mobile app", "react native", "ios app", "android app", "app development", "build an app"],
    keywords: ["mobile", "android", "ios", "apk"],
  },
  {
    name: "aiml",
    phrases: ["machine learning", "data science", "data analysis", "ai chatbot", "ai integration", "train a model", "ai agent"],
    keywords: ["ai", "ml", "chatbot", "llm", "python", "kaggle", "model", "dataset", "automation"],
  },
  {
    name: "video_editing",
    phrases: ["video editing", "video editor", "edit a video", "edit videos", "after effects", "premiere pro", "motion graphics"],
    keywords: ["video", "videos", "reel", "reels", "tiktok", "youtube", "shorts", "davinci", "capcut"],
  },
  {
    name: "graphic_design",
    phrases: ["graphic design", "ui design", "ux design", "ui ux", "brand identity", "logo design"],
    keywords: ["design", "designer", "logo", "figma", "photoshop", "thumbnail", "banner", "branding", "wireframe"],
  },
  {
    name: "services",
    phrases: ["what services", "what do you offer", "what can you do", "what can zubair do", "what can you build", "what can zubair build", "do you offer", "can you build", "can you make"],
    keywords: ["service", "services", "offer", "offering", "package", "packages", "website", "ecommerce", "shopify", "wordpress", "landing"],
  },
  {
    name: "skills",
    phrases: ["tech stack", "what technologies", "what do you know", "experience with", "do you know", "are you good at"],
    keywords: ["skill", "skills", "stack", "expertise", "technologies", "react", "nextjs", "node", "typescript", "mongodb", "javascript", "frontend", "backend", "fullstack"],
  },
  {
    name: "certifications",
    phrases: ["where did you study", "educational background"],
    keywords: ["certification", "certifications", "certificate", "education", "degree", "university", "qualification", "qualifications", "studied"],
  },
  {
    name: "timezone",
    phrases: ["time zone", "working hours", "what time", "when are you available", "business hours", "office hours"],
    keywords: ["timezone", "availability", "available", "hours", "pkt", "utc"],
  },
  {
    name: "faq",
    phrases: ["payment method", "how do i pay", "how to pay", "after delivery", "sign an nda", "fast delivery"],
    keywords: ["nda", "confidential", "revision", "revisions", "rush", "urgent", "asap", "maintenance", "refund", "payment", "paypal", "weekend", "weekends"],
  },
  {
    name: "error_search",
    phrases: ["not working", "how do i fix", "how to fix", "getting an error", "search for"],
    keywords: ["error", "bug", "crash", "debug", "exception", "undefined", "stacktrace", "fix"],
  },
  {
    name: "who_are_you",
    phrases: ["who are you", "who is zubair", "what are you", "about zubair", "about yourself", "introduce yourself", "tell me about you", "are you a bot", "are you ai"],
    keywords: ["introduce", "yourself", "bio"],
  },
  {
    name: "thanks",
    phrases: ["thank you", "thanks a lot", "see you", "good bye", "that helps", "got it"],
    keywords: ["thanks", "thank", "thx", "appreciate", "awesome", "perfect", "bye", "goodbye", "cheers"],
  },
];

const GREETING_RE = /^(hi+|hello+|hey+|yo|sup|howdy|greetings|salaa?m|assalam\w*( o)? ?alaikum|aoa|good (morning|afternoon|evening|day))\b/;
const AFFIRM_RE = /^(yes|yeah|yep|yup|sure|ok|okay|please|go ahead|sounds good|do it|yes please|of course|alright)$/;
const DENY_RE = /^(no|nope|nah|not now|no thanks|not really)$/;

// After answering an intent, a bare "yes" naturally leads to the next step.
export const FOLLOW_UP = {
  greeting: "services",
  who_are_you: "services",
  services: "pricing",
  skills: "portfolio",
  portfolio: "pricing",
  pricing: "book_call",
  mobile: "pricing",
  aiml: "pricing",
  video_editing: "pricing",
  graphic_design: "pricing",
  contract: "book_call",
  timezone: "book_call",
  contact: "book_call",
};

export const normalize = (message) =>
  String(message)
    .toLowerCase()
    .replace(/next\.?js/g, "nextjs")
    .replace(/node\.?js/g, "node")
    .replace(/full[\s-]stack/g, "fullstack")
    .replace(/e-commerce/g, "ecommerce")
    .replace(/[^\p{L}\p{N}\s$]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Edit distance ≤ 1 (insert / delete / substitute / adjacent transposition). */
const isNear = (a, b) => {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i++;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true; // substitution
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2); // transposition
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
};

// Phrase lookups are precompiled once at module load.
const COMPILED = INTENTS.map((intent) => ({
  name: intent.name,
  phrases: intent.phrases.map((p) => new RegExp(`(^| )${p}( |$)`)),
  keywords: new Set(intent.keywords),
  // Only longer keywords get typo tolerance — short ones ("ai", "ui") must be exact.
  fuzzy: intent.keywords.filter((k) => k.length >= 6),
}));

/**
 * Score a message against every intent.
 * @returns {{ intent: string, score: number, ranked: Array<{name, score}> }}
 */
export const analyze = (message, context = {}) => {
  const text = normalize(message);
  if (!text) return { intent: "unknown", score: 0, ranked: [] };

  const words = text.split(" ");

  if (context.lastIntent && words.length <= 3) {
    if (AFFIRM_RE.test(text) && FOLLOW_UP[context.lastIntent]) {
      return { intent: FOLLOW_UP[context.lastIntent], score: PHRASE_WEIGHT, ranked: [], followUp: true };
    }
    if (DENY_RE.test(text)) return { intent: "thanks", score: PHRASE_WEIGHT, ranked: [] };
  }

  const ranked = COMPILED.map((intent) => {
    let score = 0;
    for (const re of intent.phrases) if (re.test(text)) score += PHRASE_WEIGHT;
    for (const word of words) {
      if (intent.keywords.has(word)) score += KEYWORD_WEIGHT;
      else if (word.length >= 6 && intent.fuzzy.some((k) => isNear(word, k))) score += KEYWORD_WEIGHT * 0.75;
    }
    return { name: intent.name, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score); // stable: ties keep INTENTS priority order

  if (ranked.length) return { intent: ranked[0].name, score: ranked[0].score, ranked };

  // A greeting only counts when nothing more specific was asked.
  if (GREETING_RE.test(text) && words.length <= 6) return { intent: "greeting", score: PHRASE_WEIGHT, ranked };

  return { intent: "unknown", score: 0, ranked };
};

export const detectIntent = (message, context) => analyze(message, context).intent;

export default detectIntent;
