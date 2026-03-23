import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please slow down." },
});

export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: "Too many chat messages. Please wait a moment." },
});

export const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, error: "Too many contact requests. Please wait 10 minutes." },
});

export const contractLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: "Too many contract requests. Please wait before resubmitting." },
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { success: false, error: "Too many search requests. Please wait a moment." },
});

export const validateChat = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== "string" || message.trim().length === 0)
    return res.status(400).json({ success: false, error: "message is required." });
  if (message.length > 2000)
    return res.status(400).json({ success: false, error: "message must be under 2000 characters." });
  next();
};

export const validateContact = (req, res, next) => {
  const { senderName, senderEmail, subject, message } = req.body;
  const errors = [];
  if (!senderName || senderName.trim().length < 2) errors.push("senderName required (min 2 chars).");
  if (!senderEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) errors.push("Valid senderEmail required.");
  if (!subject || subject.trim().length < 3) errors.push("subject required (min 3 chars).");
  if (!message || message.trim().length < 10) errors.push("message required (min 10 chars).");
  if (errors.length) return res.status(400).json({ success: false, errors });
  next();
};

export const validateContract = (req, res, next) => {
  const { clientName, clientEmail, projectTitle, projectDescription, budget, timeline } = req.body;
  const errors = [];
  if (!clientName || clientName.trim().length < 2) errors.push("clientName required.");
  if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) errors.push("Valid clientEmail required.");
  if (!projectTitle || projectTitle.trim().length < 3) errors.push("projectTitle required.");
  if (!projectDescription || projectDescription.trim().length < 20) errors.push("projectDescription required (min 20 chars).");
  if (!budget) errors.push("budget required (e.g. '$500').");
  if (!timeline) errors.push("timeline required (e.g. '2 weeks').");
  if (errors.length) return res.status(400).json({ success: false, errors });
  next();
};

export const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} — ${err.message}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal server error.",
  });
};

export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
    hint: "See GET /api for all available endpoints.",
  });
};
