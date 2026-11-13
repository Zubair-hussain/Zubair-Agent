import nodemailer from "nodemailer";
import config from "../config.js";
import { buildContractHTML } from "./contractHandler.js";
import { escapeHtml as esc } from "../lib/sanitize.js";

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: config.email.user, pass: config.email.pass },
    });
  }
  return transporter;
};

// NOTE: every value that originates from a visitor is HTML-escaped before it is
// placed in an email body, and subjects/names are single-line (no CR/LF), so a
// message can never inject markup, links or extra mail headers.

export const sendContractEmail = async (contract) => {
  const t = getTransporter();
  const html = buildContractHTML(contract);

  await t.sendMail({
    from: `"Xovato AI Agent" <${config.email.user}>`,
    to: config.email.to,
    replyTo: contract.client.email,
    subject: `[Contract ${contract.contractId}] ${contract.project.title} — ${contract.client.name}`,
    html,
  });

  await t.sendMail({
    from: `"Zubair Hussain — Xovato" <${config.email.user}>`,
    to: contract.client.email,
    subject: `Your Project Proposal — ${contract.project.title} [${contract.contractId}]`,
    html,
  });
};

const wrap = (title, rows, body) => `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;">
    <div style="background:#1a1a2e;color:white;padding:20px 24px;">
      <h2 style="margin:0;font-size:18px;">${title}</h2>
    </div>
    <div style="padding:24px;background:#fafafa;">
      <table style="width:100%;border-collapse:collapse;">
        ${rows
          .filter(([, value]) => value)
          .map(
            ([label, value]) =>
              `<tr><td style="padding:8px 0;color:#666;font-size:13px;width:120px;"><strong>${label}</strong></td><td style="padding:8px 0;font-size:14px;">${esc(value)}</td></tr>`
          )
          .join("")}
      </table>
      <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;"/>
      <div style="background:white;border-left:3px solid #c8141e;padding:14px 16px;border-radius:4px;font-size:14px;line-height:1.6;color:#444;">
        ${esc(body).replace(/\n/g, "<br/>")}
      </div>
    </div>
    <div style="background:#f0f0f0;padding:14px 24px;font-size:12px;color:#888;text-align:center;">Sent via Zubair AI Agent — Xovato</div>
  </div>`;

export const sendContactEmail = async ({ senderName, senderEmail, subject, message, timezone }) => {
  await getTransporter().sendMail({
    from: `"Xovato AI Agent" <${config.email.user}>`,
    to: config.email.to,
    replyTo: senderEmail,
    subject: `[Inquiry] ${subject} — from ${senderName}`,
    html: wrap(
      "📬 New Inquiry via Zubair AI Agent",
      [["From", senderName], ["Email", senderEmail], ["Subject", subject], ["Timezone", timezone]],
      message
    ),
  });
};

/** Fallback alert when a live-chat visitor writes and no push device is reachable. */
export const sendLiveChatAlert = async ({ name, email, page, text, inboxUrl }) => {
  if (!config.email.enabled) return;
  await getTransporter().sendMail({
    from: `"Zubair Live Chat" <${config.email.user}>`,
    to: config.email.to,
    ...(email ? { replyTo: email } : {}),
    subject: `[Live chat] New message${name ? ` from ${name}` : ""}`,
    html: wrap("💬 New live-chat message", [["Visitor", name], ["Email", email], ["Page", page], ["Inbox", inboxUrl]], text),
  });
};
