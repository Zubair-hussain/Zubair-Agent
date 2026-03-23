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
  if (!budget || budget.trim().length < 1) errors.push("budget required.");
  if (!timeline || timeline.trim().length < 1) errors.push("timeline required.");
  if (errors.length) return res.status(400).json({ success: false, errors });
  next();
};
