const crypto = require('node:crypto');

const HASH_ALGORITHM = 'sha256';
const HASH_ITERATIONS = 120000;
const HASH_KEY_LENGTH = 32;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 10 * 60 * 1000;

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(
    String(password),
    String(salt),
    HASH_ITERATIONS,
    HASH_KEY_LENGTH,
    HASH_ALGORITHM
  ).toString('hex');
}

function verifyPassword(password, passwordHash, salt) {
  const candidateHash = hashPassword(password, salt);
  const candidate = Buffer.from(candidateHash, 'hex');
  const expected = Buffer.from(String(passwordHash || ''), 'hex');

  if (candidate.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidate, expected);
}

function createSession(openid, now = Date.now()) {
  const expiresAt = now + SESSION_TTL_MS;
  const token = crypto
    .createHash('sha256')
    .update(`${openid}:${expiresAt}:${crypto.randomBytes(16).toString('hex')}`)
    .digest('hex');

  return { token, expiresAt };
}

function isSessionValid(session, now = Date.now()) {
  return Boolean(session && session.token && session.expiresAt > now);
}

function getLockoutUntil(record, now = Date.now()) {
  if (!record || !record.lockedUntil) return 0;
  return record.lockedUntil > now ? record.lockedUntil : 0;
}

function isLoginLocked(record, now = Date.now()) {
  return getLockoutUntil(record, now) > now;
}

function nextFailedLoginState(record, now = Date.now()) {
  const failedAttempts = (record && record.failedAttempts ? record.failedAttempts : 0) + 1;
  return {
    failedAttempts,
    lockedUntil: failedAttempts >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : 0,
    updatedAt: new Date(now).toISOString()
  };
}

function resetFailedLoginState(now = Date.now()) {
  return {
    failedAttempts: 0,
    lockedUntil: 0,
    updatedAt: new Date(now).toISOString()
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  isSessionValid,
  isLoginLocked,
  nextFailedLoginState,
  resetFailedLoginState
};
