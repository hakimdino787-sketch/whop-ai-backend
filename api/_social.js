import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const COOKIE = "ben_social";
const STATE_COOKIE = "ben_oauth_state";

function secret() {
  const value = process.env.SOCIAL_SESSION_SECRET;
  if (!value) throw new Error("SOCIAL_SESSION_SECRET is not configured");
  return createHash("sha256").update(value).digest();
}

export function setCookie(res, name, value, maxAge = 60 * 60 * 24 * 30) {
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
  res.setHeader("Set-Cookie", cookie);
}

export function clearCookie(res, name) {
  setCookie(res, name, "", 0);
}

export function getCookie(req, name) {
  const raw = req.headers.cookie || "";
  const part = raw.split(";").map(v => v.trim()).find(v => v.startsWith(name + "="));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
}

export function encrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, data]).toString("base64url");
}

export function decrypt(value) {
  if (!value) return null;
  try {
    const buf = Buffer.from(value, "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", secret(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8"));
  } catch {
    return null;
  }
}

export function makeState(provider) {
  return encrypt({ provider, nonce: randomBytes(16).toString("hex"), iat: Date.now() });
}

export function verifyState(value, provider) {
  const state = decrypt(value);
  return !!state && state.provider === provider && Date.now() - state.iat < 10 * 60 * 1000;
}

export function saveTokens(res, provider, tokens) {
  setCookie(res, COOKIE, encrypt({ provider, ...tokens, savedAt: Date.now() }), 60 * 60 * 24 * 365);
}

export function loadTokens(req, provider) {
  const data = decrypt(getCookie(req, COOKIE));
  return data && data.provider === provider ? data : null;
}

export { COOKIE, STATE_COOKIE };
