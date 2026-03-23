import nodemailer from "nodemailer";
import { buildContractHTML } from "../handlers/contractHandler.js";

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

export const sendContractEmail = async (contract) => {
  const t = getTransporter();
  const html = buildContractHTML(contract);

  // To Zubair
  await t.sendMail({
    from: `"Xovato AI Agent" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    replyTo: contract.client.email,
    subject: `[Contract ${contract.contractId}] ${contract.project.title} — ${contract.client.name}`,
    html,
  });

  // To client
  await t.sendMail({
    from: `"Zubair Hussain — Xovato" <${process.env.EMAIL_USER}>`,
    to: contract.client.email,
    subject: `Your Project Proposal — ${contract.project.title} [${contract.contractId}]`,
    html,
  });
};

export const sendContactEmail = async ({ senderName, senderEmail, subject, message, timezone }) => {
  const t = getTransporter();
  const pkt = new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "full", timeStyle: "short" });

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
      <div style="background:#1a1a2e;color:white;padding:20px 24px;">
        <h2 style="margin:0;font-size:18px;">📬 New Inquiry via Zubair AI Agent</h2>
        <p style="margin:6px 0 0;opacity:0.7;font-size:13px;">Received: ${pkt} (PKT)</p>
      </div>
      <div style="padding:24px;background:#fafafa;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#666;font-size:13px;width:120px;"><strong>From</strong></td><td style="padding:8px 0;font-size:14px;">${senderName}</td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Email</strong></td><td style="padding:8px 0;font-size:14px;"><a href="mailto:${senderEmail}">${senderEmail}</a></td></tr>
          <tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Subject</strong></td><td style="padding:8px 0;font-size:14px;">${subject}</td></tr>
          ${timezone ? `<tr><td style="padding:8px 0;color:#666;font-size:13px;"><strong>Timezone</strong></td><td style="padding:8px 0;font-size:14px;">${timezone}</td></tr>` : ""}
        </table>
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
        <div style="background:white;border-left:3px solid #0066cc;padding:14px 16px;border-radius:4px;font-size:14px;line-height:1.6;color:#444;">
          ${message.replace(/\n/g, "<br/>")}
        </div>
      </div>
      <div style="background:#f0f0f0;padding:14px 24px;font-size:12px;color:#888;text-align:center;">Sent via Zubair AI Agent — Xovato</div>
    </div>
  `;

  await t.sendMail({
    from: `"Xovato AI Agent" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO || process.env.EMAIL_USER,
    replyTo: senderEmail,
    subject: `[Inquiry] ${subject} — from ${senderName}`,
    html,
  });
};
