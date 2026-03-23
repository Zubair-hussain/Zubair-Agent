import { v4 as uuidv4 } from "uuid";
import { sendContractEmail } from "../services/emailService.js";

export const contractHandler = async (req, res, next) => {
  try {
    const { clientName, clientEmail, projectTitle, projectDescription, budget, timeline, clientTimezone } = req.body;
    const contractId = `XOV-${Date.now().toString(36).toUpperCase()}`;

    await sendContractEmail({
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim().toLowerCase(),
      projectTitle: projectTitle.trim(),
      projectDescription: projectDescription.trim(),
      budget: budget.trim(),
      timeline: timeline.trim(),
      clientTimezone: clientTimezone || "Not specified",
      contractId,
    });

    res.status(201).json({
      success: true,
      contractId,
      message: `Contract sent to ${clientEmail} and Zubair has been notified. Expect a response within 24 hours (PKT).`,
      summary: { client: clientName, project: projectTitle, budget, timeline, contractId },
    });
  } catch (err) {
    next(err);
  }
};
