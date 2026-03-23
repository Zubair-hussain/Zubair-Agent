import { sendContactEmail } from "../services/emailService.js";

export const contactHandler = async (req, res, next) => {
  try {
    const { senderName, senderEmail, subject, message, timezone } = req.body;
    await sendContactEmail({
      senderName: senderName.trim(),
      senderEmail: senderEmail.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
      timezone,
    });
    res.json({
      success: true,
      message: `Message sent! Zubair will reply to ${senderEmail} within 24 hours (PKT).`,
    });
  } catch (err) {
    next(err);
  }
};
