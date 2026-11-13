// ─────────────────────────────────────────────────────────────────────────────
//  Authentication
//   • Admin (Zubair): username + password → scrypt verification → HS256 JWT in
//     an HttpOnly, Secure, SameSite=Strict cookie. JavaScript can never read it.
//   • Visitor: a JWT scoped to ONE conversation id, sent as a Bearer token.
//
//  The password itself is never stored anywhere — only its salted scrypt hash
//  lives in the ADMIN_PASSWORD_HASH environment variable.
// ─────────────────────────────────────────────────────────────────────────────
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import config from "../config.js";

const ALGORITHM = "HS256";
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// ── Password hashing ────────────────────────────────────────────────────────
export const hashPassword = (password) => {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
};

const scryptAsync = (password, salt, keylen, options) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)))
  );

export const verifyPassword = async (password, stored) => {
  try {
    const [scheme, N, r, p, saltB64, hashB64] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const expected = Buffer.from(hashB64, "base64url");
    const actual = await scryptAsync(password, Buffer.from(saltB64, "base64url"), expected.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
    });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
};

/** Constant-time string compare (hashes first so lengths never leak). */
export const safeEqual = (a, b) => {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

// Changing the password (a new ADMIN_PASSWORD_HASH) invalidates every
// previously issued admin session, because this fingerprint is baked into them.
const passwordVersion = () =>
  crypto.createHash("sha256").update(config.admin.passwordHash).digest("hex").slice(0, 16);

// ── Tokens ──────────────────────────────────────────────────────────────────
const sign = (payload, audience, expiresIn) =>
  jwt.sign(payload, config.jwt.secret, { algorithm: ALGORITHM, issuer: config.jwt.issuer, audience, expiresIn });

const verify = (token, audience) => {
  if (!config.jwt.ready || typeof token !== "string" || token.length > 2048) return null;
  try {
    // `algorithms` is pinned so "alg: none" / algorithm-confusion tokens are rejected.
    return jwt.verify(token, config.jwt.secret, {
      algorithms: [ALGORITHM],
      issuer: config.jwt.issuer,
      audience,
    });
  } catch {
    return null;
  }
};

export const signAdminToken = () =>
  sign({ sub: config.admin.username, pwv: passwordVersion() }, "admin", `${config.admin.sessionHours}h`);

export const verifyAdminToken = (token) => {
  if (!config.admin.enabled) return null;
  const payload = verify(token, "admin");
  if (!payload || payload.sub !== config.admin.username || payload.pwv !== passwordVersion()) return null;
  return payload;
};

export const signVisitorToken = (conversationId) =>
  sign({ sub: conversationId }, "visitor", `${config.jwt.visitorDays}d`);

export const verifyVisitorToken = (token) => verify(token, "visitor");

// ── Cookies ─────────────────────────────────────────────────────────────────
export const readCookie = (req, name) => {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > -1 && part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
};

const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: "strict",
  path: "/",
});

export const setAdminCookie = (res, token) =>
  res.cookie(config.admin.cookieName, token, {
    ...cookieOptions(),
    maxAge: config.admin.sessionHours * 60 * 60 * 1000,
  });

export const clearAdminCookie = (res) => res.clearCookie(config.admin.cookieName, cookieOptions());

// ── Middleware ──────────────────────────────────────────────────────────────
export const requireAdmin = (req, res, next) => {
  const payload = verifyAdminToken(readCookie(req, config.admin.cookieName));
  if (!payload) return res.status(401).json({ success: false, error: "Not authenticated." });
  req.admin = payload;
  next();
};

export const requireVisitor = (req, res, next) => {
  const header = req.headers.authorization || "";
  const payload = header.startsWith("Bearer ") ? verifyVisitorToken(header.slice(7)) : null;
  if (!payload) return res.status(401).json({ success: false, error: "Invalid or expired chat session." });
  req.conversationId = payload.sub;
  next();
};

/**
 * CSRF guard for cookie-authenticated routes. SameSite=Strict already blocks
 * cross-site cookie sends; this additionally requires the browser-set Origin
 * header to match this server and the body to be JSON (not a plain form post).
 */
export const sameOriginOnly = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.headers.origin;
  const host = req.headers.host; // never a client-controllable forwarded header
  let originHost = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || originHost !== host) {
    return res.status(403).json({ success: false, error: "Cross-site request blocked." });
  }
  if (req.method !== "DELETE" && !req.is("application/json")) {
    return res.status(415).json({ success: false, error: "JSON body required." });
  }
  next();
};
