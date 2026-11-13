// Input hygiene helpers. Chat text is stored as plain text and ALWAYS rendered
// as text by the clients (never innerHTML); these helpers add defence in depth.

/** Strip control characters (keeps \n and \t), trim, and cap the length. */
export const cleanText = (value, maxLength) => {
  if (typeof value !== "string") return "";
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim()
    .slice(0, maxLength);
};

/** Single-line variant — also blocks e-mail header injection (no CR/LF). */
export const cleanLine = (value, maxLength) => cleanText(value, maxLength).replace(/\s+/g, " ");

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
export const isEmail = (value) => typeof value === "string" && value.length <= 160 && EMAIL_RE.test(value);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const isUuid = (value) => typeof value === "string" && UUID_RE.test(value);
