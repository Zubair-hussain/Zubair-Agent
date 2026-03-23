import { generateContract } from "../handlers/contractHandler.js";
import { sendContractEmail, sendContactEmail } from "../handlers/emailService.js";
import { searchWeb, formatSearchResults } from "../handlers/searchHandler.js";
import { knowledge as k } from "../knowledge/index.js";
import { getPKTNow, convertTimezone } from "../utils/timezone.js";

// ── CONTRACT ──────────────────────────────────────────────────────────────────
export const contractHandler = async (req, res, next) => {
  try {
    const contract = generateContract({
      clientName: req.body.clientName.trim(),
      clientEmail: req.body.clientEmail.trim().toLowerCase(),
      projectTitle: req.body.projectTitle.trim(),
      projectDescription: req.body.projectDescription.trim(),
      budget: req.body.budget.trim(),
      timeline: req.body.timeline.trim(),
      clientTimezone: req.body.clientTimezone || "Not specified",
    });

    // Send emails if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendContractEmail(contract);
    }

    res.status(201).json({
      success: true,
      contractId: contract.contractId,
      message: `Contract generated. ${process.env.EMAIL_USER ? `Emails sent to ${contract.client.email} and Zubair.` : "Email not configured — see contract data below."}`,
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
    const { senderName, senderEmail, subject, message, timezone } = req.body;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendContactEmail({
        senderName: senderName.trim(),
        senderEmail: senderEmail.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        timezone: timezone || "Not specified",
      });
    }

    res.json({
      success: true,
      message: `Message sent to Zubair. He'll reply to ${senderEmail} within 24 hours (PKT business days).`,
      whatsapp: k.links.whatsapp,
    });
  } catch (err) {
    next(err);
  }
};

// ── PROFILE ───────────────────────────────────────────────────────────────────
export const profileHandler = (req, res) => {
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

export const pricingHandler = (req, res) => {
  res.json({
    success: true,
    pricing: k.pricing,
    paymentTerms: "50% upfront · 50% on delivery · 3 revision rounds included",
    contact: k.links.whatsapp,
    bookCall: k.personal.bookingLink,
  });
};

export const timezoneHandler = (req, res) => {
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
    const { query } = req.body;
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ success: false, error: "query is required (min 3 chars)." });
    }
    const results = await searchWeb(query.trim());
    const formatted = formatSearchResults(results, query.trim());
    res.json({ success: true, ...results, formatted });
  } catch (err) {
    next(err);
  }
};
