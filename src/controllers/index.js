// Stateless public endpoints: one-shot AI chat, contract, contact, search, profile.
import config from "../config.js";
import { generateContract } from "../handlers/contractHandler.js";
import { sendContractEmail, sendContactEmail } from "../handlers/emailService.js";
import { searchWeb, formatSearchResults } from "../handlers/searchHandler.js";
import { generateReply } from "../engine/agent.js";
import { knowledge as k } from "../knowledge/index.js";
import { getStatus } from "../live/conversations.js";
import { cleanLine, cleanText, isEmail } from "../lib/sanitize.js";
import { getPKTNow, convertTimezone } from "../utils/timezone.js";

const bad = (res, errors) => res.status(400).json({ success: false, errors });

// ── CHAT (stateless) ──────────────────────────────────────────────────────────
// No server-side session is kept here any more: the old in-memory session map
// was publicly listable/readable/deletable. Persistent threads live in /api/live.
export const chatHandler = async (req, res, next) => {
  try {
    const message = cleanText(req.body?.message, config.chat.maxMessageLength);
    if (!message) return res.status(400).json({ success: false, error: "message is required." });
    const lastIntent = cleanLine(req.body?.lastIntent, 40);
    const status = await getStatus();
    const { intent, reply } = await generateReply(message, { lastIntent, adminOnline: status.online });
    res.json({ success: true, intent, reply, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
};

// ── CONTRACT ──────────────────────────────────────────────────────────────────
export const contractHandler = async (req, res, next) => {
  try {
    const input = {
      clientName: cleanLine(req.body?.clientName, 80),
      clientEmail: cleanLine(req.body?.clientEmail, 160).toLowerCase(),
      projectTitle: cleanLine(req.body?.projectTitle, 120),
      projectDescription: cleanText(req.body?.projectDescription, 3000),
      budget: cleanLine(req.body?.budget, 60),
      timeline: cleanLine(req.body?.timeline, 60),
      clientTimezone: cleanLine(req.body?.clientTimezone, 60) || "Not specified",
    };

    const errors = [];
    if (input.clientName.length < 2) errors.push("clientName required.");
    if (!isEmail(input.clientEmail)) errors.push("Valid clientEmail required.");
    if (input.projectTitle.length < 3) errors.push("projectTitle required.");
    if (input.projectDescription.length < 20) errors.push("projectDescription required (min 20 chars).");
    if (!input.budget) errors.push("budget required (e.g. '$500').");
    if (!input.timeline) errors.push("timeline required (e.g. '2 weeks').");
    if (errors.length) return bad(res, errors);

    const contract = generateContract(input);
    if (config.email.enabled) await sendContractEmail(contract);

    res.status(201).json({
      success: true,
      contractId: contract.contractId,
      message: config.email.enabled
        ? "Contract generated and emailed to you and Zubair."
        : "Contract generated — see the contract data below.",
      contract: {
        contractId: contract.contractId,
        createdAt: contract.createdAt,
        client: contract.client,
        project: contract.project,
        terms: contract.terms,
        nextSteps: contract.nextSteps,
        developer: contract.developer,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── CONTACT ───────────────────────────────────────────────────────────────────
export const contactHandler = async (req, res, next) => {
  try {
    const input = {
      senderName: cleanLine(req.body?.senderName, 80),
      senderEmail: cleanLine(req.body?.senderEmail, 160).toLowerCase(),
      subject: cleanLine(req.body?.subject, 140),
      message: cleanText(req.body?.message, 4000),
      timezone: cleanLine(req.body?.timezone, 60) || "Not specified",
    };

    const errors = [];
    if (input.senderName.length < 2) errors.push("senderName required (min 2 chars).");
    if (!isEmail(input.senderEmail)) errors.push("Valid senderEmail required.");
    if (input.subject.length < 3) errors.push("subject required (min 3 chars).");
    if (input.message.length < 10) errors.push("message required (min 10 chars).");
    if (errors.length) return bad(res, errors);

    if (config.email.enabled) await sendContactEmail(input);

    res.json({
      success: true,
      message: "Message sent to Zubair. He'll reply within 24 hours (PKT business days).",
      whatsapp: k.links.whatsapp,
    });
  } catch (err) {
    next(err);
  }
};

// ── PROFILE ───────────────────────────────────────────────────────────────────
export const profileHandler = (_req, res) => {
  res.json({
    success: true,
    profile: {
      name: k.personal.name,
      title: k.personal.title,
      location: k.personal.location,
      timezone: k.personal.timezone,
      links: k.links,
      agency: k.agency,
      skills: k.skills,
      experience: k.experience,
      projects: k.projects,
      pricing: k.pricing,
      certifications: k.certifications,
      education: k.education,
      notion: k.notion,
      upwork: k.upwork,
      fiverr: k.fiverr,
    },
  });
};

export const pricingHandler = (_req, res) => {
  res.json({
    success: true,
    pricing: k.pricing,
    paymentTerms: "50% upfront · 50% on delivery · 3 revision rounds included",
    contact: k.links.whatsapp,
    bookCall: k.personal.bookingLink,
  });
};

export const timezoneHandler = (_req, res) => {
  res.json({
    success: true,
    currentPKT: getPKTNow(),
    timezone: k.personal.timezone,
    availability: "9AM–9PM PKT, Monday–Saturday",
    conversions: convertTimezone(),
    bookingLink: k.personal.bookingLink,
  });
};

// ── SEARCH ────────────────────────────────────────────────────────────────────
export const searchHandler = async (req, res, next) => {
  try {
    const query = cleanLine(req.body?.query, 200);
    if (query.length < 3) return res.status(400).json({ success: false, error: "query is required (min 3 chars)." });
    const results = await searchWeb(query);
    res.json({ success: true, ...results, formatted: formatSearchResults(results, query) });
  } catch (err) {
    next(err);
  }
};
