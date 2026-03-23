import { KB } from "../knowledge/kb.js";

export const getProfile = (_req, res) => {
  const { identity, platforms, skills, services, projects, certifications, education, stats, notion } = KB;
  res.json({
    success: true,
    profile: {
      name: identity.name,
      title: identity.title,
      location: identity.location,
      timezone: identity.timezone,
      available: identity.available,
      whatsapp: identity.whatsapp,
      bookingLink: identity.bookingLink,
      platforms: Object.fromEntries(Object.entries(platforms).map(([k, v]) => [k, { label: v.label, url: v.url }])),
      skills,
      services,
      projects,
      certifications,
      education,
      stats,
      notion: notion.url,
    },
  });
};

export const getServices = (_req, res) => {
  res.json({ success: true, services: KB.services, note: "Final quotes after scoping. Contact via /api/contact or /api/contract." });
};

export const getTimezone = (_req, res) => {
  const pkt = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "full", timeStyle: "medium" });
  res.json({
    success: true,
    currentPKT: pkt,
    timezone: "PKT — Pakistan Standard Time (UTC+5)",
    available: KB.identity.available,
    conversions: {
      "US Eastern (EST)": "PKT - 10 hours",
      "US Central (CST)": "PKT - 11 hours",
      "US Pacific (PST)": "PKT - 13 hours",
      "Australia Eastern (AEST)": "PKT + 5 hours",
      "UK (GMT)": "PKT - 5 hours",
      "UAE (GST)": "PKT - 1 hour",
    },
  });
};
