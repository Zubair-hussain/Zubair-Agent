import nodemailer from "nodemailer";
import { KB } from "../knowledge/kb.js";

const getTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

export const sendContactEmail = async ({ senderName, senderEmail, subject, message, timezone }) => {
  const t = getTransporter();
  const pkt = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "full", timeStyle: "short" });

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#1a1a2e;color:white;padding:20px 24px;">
      <h2 style="margin:0;font-size:18px;">📬 New Inquiry — Zubair AI Agent</h2>
      <p style="margin:6px 0 0;opacity:0.7;font-size:13px;">Received: ${pkt} PKT</p>
    </div>
    <div style="padding:24px;background:#fafafa;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#666;font-size:13px;width:120px;"><strong>From</strong></td><td style="padding:8px 0;font-size:14px;">${senderName}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Email</strong></td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${senderEmail}">${senderEmail}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Subject</strong></td><td style="padding:8px 0;font-size:14px;">${subject}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Timezone</strong></td><td style="padding:8px 0;font-size:14px;">${timezone || "Not specified"}</td></tr>
      </table>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
      <div style="background:white;border-left:3px solid #1a1a2e;padding:14px 16px;border-radius:4px;font-size:14px;line-height:1.6;color:#444;">${message.replace(/\n/g, "<br/>")}</div>
    </div>
    <div style="background:#f0f0f0;padding:12px 24px;font-size:12px;color:#888;text-align:center;">Zubair AI Agent — Xovato Digital Agency</div>
  </div>`;

  await t.sendMail({
    from: `"Zubair AI Agent" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    replyTo: senderEmail,
    subject: `[AI Agent] ${subject} — from ${senderName}`,
    html,
  });
};

export const sendContractEmail = async (data) => {
  const t = getTransporter();
  const { clientName, clientEmail, projectTitle, projectDescription, budget, timeline, clientTimezone, contractId } = data;
  const pkt = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "full", timeStyle: "short" });

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;border:1px solid #ddd;border-radius:10px;overflow:hidden;">
    <div style="background:#0f3460;color:white;padding:24px;">
      <div style="font-size:11px;letter-spacing:2px;opacity:0.6;margin-bottom:6px;">XOVATO DIGITAL AGENCY</div>
      <h1 style="margin:0;font-size:22px;">📄 Project Proposal & Agreement</h1>
      <p style="margin:8px 0 0;opacity:0.7;font-size:13px;">Contract ID: ${contractId} | ${pkt} PKT</p>
    </div>
    <div style="padding:28px;background:#fff;">
      <h3 style="color:#0f3460;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">👤 Client Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#666;font-size:13px;width:130px;"><strong>Client</strong></td><td style="font-size:14px;">${clientName}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Email</strong></td><td style="font-size:14px;"><a href="mailto:${clientEmail}">${clientEmail}</a></td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Timezone</strong></td><td style="font-size:14px;">${clientTimezone || "Not specified"}</td></tr>
      </table>
      <h3 style="color:#0f3460;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">💼 Project Details</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#666;font-size:13px;width:130px;"><strong>Project</strong></td><td style="font-size:14px;">${projectTitle}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Budget</strong></td><td style="font-size:14px;color:#2e7d32;font-weight:bold;">${budget}</td></tr>
        <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Timeline</strong></td><td style="font-size:14px;">${timeline}</td></tr>
      </table>
      <h3 style="color:#0f3460;border-bottom:2px solid #f0f0f0;padding-bottom:8px;">📋 Description</h3>
      <div style="background:#f8f9fa;border-left:3px solid #0f3460;padding:14px;border-radius:4px;font-size:14px;line-height:1.7;color:#444;margin-bottom:24px;">${projectDescription.replace(/\n/g, "<br/>")}</div>
      <div style="background:#fffde7;border:1px solid #f9a825;border-radius:8px;padding:18px 20px;margin-bottom:24px;">
        <h3 style="margin:0 0 12px;color:#e65100;font-size:15px;">📜 Standard Terms & Conditions</h3>
        <ol style="margin:0;padding-left:18px;font-size:13px;line-height:1.9;color:#555;">
          ${KB.contractTerms.map(t => `<li>${t}</li>`).join("")}
        </ol>
      </div>
      <div style="background:#e8f5e9;border-radius:8px;padding:16px 20px;">
        <p style="margin:0;font-size:14px;color:#2e7d32;">✅ <strong>Next Step:</strong> Reply to confirm interest. Zubair will respond within 24 hours PKT.</p>
      </div>
    </div>
    <div style="background:#0f3460;color:white;padding:18px 24px;text-align:center;">
      <p style="margin:0;font-size:13px;">Syed Zubair Hussain Shah — Xovato Digital Agency</p>
      <p style="margin:6px 0 0;font-size:12px;opacity:0.7;">
        <a href="${KB.platforms.linkedin.url}" style="color:#90caf9;">LinkedIn</a> &nbsp;|&nbsp;
        <a href="${KB.platforms.github.url}" style="color:#90caf9;">GitHub</a> &nbsp;|&nbsp;
        <a href="${KB.platforms.portfolio.url}" style="color:#90caf9;">Portfolio</a>
      </p>
    </div>
  </div>`;

  await t.sendMail({
    from: `"Zubair AI Agent" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    replyTo: clientEmail,
    subject: `[Contract #${contractId}] ${projectTitle} — ${clientName}`,
    html,
  });

  await t.sendMail({
    from: `"Zubair Hussain — Xovato" <${process.env.EMAIL_USER}>`,
    to: clientEmail,
    subject: `Your Project Proposal — ${projectTitle} [Contract #${contractId}]`,
    html,
  });
};
