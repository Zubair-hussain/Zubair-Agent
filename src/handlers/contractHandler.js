import { v4 as uuidv4 } from "uuid";
import { knowledge as k } from "../knowledge/index.js";

/**
 * Generate a contract object from client input
 */
export const generateContract = ({ clientName, clientEmail, projectTitle, projectDescription, budget, timeline, clientTimezone }) => {
  const contractId = `XOV-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = new Date().toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    dateStyle: "full",
    timeStyle: "short",
  });

  return {
    contractId,
    createdAt,
    developer: {
      name: k.personal.name,
      agency: k.agency.name,
      location: k.personal.location,
      timezone: k.personal.timezone,
      whatsapp: k.personal.whatsapp,
      linkedin: k.links.linkedin,
      portfolio: k.links.portfolio,
    },
    client: {
      name: clientName,
      email: clientEmail,
      timezone: clientTimezone || "Not specified",
    },
    project: {
      title: projectTitle,
      description: projectDescription,
      budget,
      timeline,
    },
    terms: k.contractTerms,
    nextSteps: [
      "Reply to the contract email to confirm interest.",
      "Zubair will schedule a scoping call within 24 hours.",
      "50% deposit invoice will be sent after scope is agreed.",
      "Work begins upon receipt of deposit.",
    ],
  };
};

/**
 * Generate HTML email for contract
 */
export const buildContractHTML = (contract) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .wrapper { max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.1); }
    .header { background: #0f3460; color: white; padding: 28px 32px; }
    .header .agency { font-size: 11px; letter-spacing: 3px; opacity: 0.6; margin-bottom: 6px; text-transform: uppercase; }
    .header h1 { margin: 0; font-size: 22px; }
    .header .meta { margin-top: 8px; font-size: 12px; opacity: 0.6; }
    .body { padding: 28px 32px; }
    .section-title { font-size: 14px; font-weight: bold; color: #0f3460; border-bottom: 2px solid #f0f0f0; padding-bottom: 8px; margin: 24px 0 14px; text-transform: uppercase; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 8px 0; font-size: 14px; }
    td:first-child { color: #888; width: 140px; font-size: 13px; }
    .desc { background: #f8f9fa; border-left: 3px solid #0f3460; padding: 14px 16px; border-radius: 4px; font-size: 14px; line-height: 1.7; color: #444; }
    .terms { background: #fffde7; border: 1px solid #f9a825; border-radius: 8px; padding: 18px 20px; margin: 20px 0; }
    .terms h3 { margin: 0 0 12px; color: #e65100; font-size: 14px; }
    .terms ol { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.9; color: #555; }
    .next { background: #e8f5e9; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .next p { margin: 0 0 8px; font-size: 13px; color: #2e7d32; font-weight: bold; }
    .next ol { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8; color: #444; }
    .footer { background: #0f3460; color: white; padding: 18px 32px; text-align: center; }
    .footer p { margin: 0; font-size: 13px; opacity: 0.9; }
    .footer a { color: #90caf9; text-decoration: none; }
    .budget { color: #2e7d32; font-weight: bold; font-size: 15px; }
    .contract-id { font-family: monospace; background: #eee; padding: 2px 8px; border-radius: 4px; font-size: 13px; }
  </style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="agency">Xovato Digital Agency</div>
    <h1>📄 Project Proposal & Agreement</h1>
    <div class="meta">Contract ID: <span class="contract-id">${contract.contractId}</span> &nbsp;|&nbsp; ${contract.createdAt} (PKT)</div>
  </div>
  <div class="body">

    <div class="section-title">👤 Client Details</div>
    <table>
      <tr><td>Client Name</td><td>${contract.client.name}</td></tr>
      <tr><td>Client Email</td><td><a href="mailto:${contract.client.email}">${contract.client.email}</a></td></tr>
      <tr><td>Timezone</td><td>${contract.client.timezone}</td></tr>
    </table>

    <div class="section-title">💼 Project Details</div>
    <table>
      <tr><td>Project Title</td><td>${contract.project.title}</td></tr>
      <tr><td>Budget</td><td class="budget">${contract.project.budget}</td></tr>
      <tr><td>Timeline</td><td>${contract.project.timeline}</td></tr>
    </table>

    <div class="section-title">📋 Project Description</div>
    <div class="desc">${contract.project.description.replace(/\n/g, "<br/>")}</div>

    <div class="terms">
      <h3>📜 Standard Terms & Conditions</h3>
      <ol>
        ${contract.terms.map(t => `<li>${t}</li>`).join("")}
      </ol>
    </div>

    <div class="next">
      <p>✅ Next Steps:</p>
      <ol>
        ${contract.nextSteps.map(s => `<li>${s}</li>`).join("")}
      </ol>
    </div>

  </div>
  <div class="footer">
    <p>${contract.developer.name} — ${contract.developer.agency}</p>
    <p style="margin-top:8px; font-size:12px; opacity:0.6;">
      <a href="${contract.developer.linkedin}">LinkedIn</a> &nbsp;|&nbsp;
      <a href="${contract.developer.portfolio}">Portfolio</a> &nbsp;|&nbsp;
      <a href="https://wa.me/923110302103">WhatsApp</a>
    </p>
  </div>
</div>
</body>
</html>
`;
