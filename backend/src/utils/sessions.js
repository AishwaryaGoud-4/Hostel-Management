const crypto = require('crypto');
const User = require('../models/User');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// A rotated token stays usable briefly so parallel tabs or a refresh interrupted by a
// page navigation (server rotated, browser never stored the new cookie) don't log the user out.
const ROTATION_GRACE_MS = 2 * 60 * 1000;
const MAX_TOKENS = 40;

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

function tokenEntry(token, family, req) {
  return {
    hash: hashToken(token),
    family,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    userAgent: String(req?.headers?.['user-agent'] || '').slice(0, 200),
    createdAt: new Date(),
  };
}

async function startSession(userId, refreshToken, req, { session } = {}) {
  const family = crypto.randomUUID();
  await User.updateOne(
    { _id: userId },
    { $push: { refreshSessions: { $each: [tokenEntry(refreshToken, family, req)], $slice: -MAX_TOKENS } } },
    { session },
  );
  return family;
}

/** Validates `oldToken`, issues `newToken` in the same session family. Returns false if invalid. */
async function rotateSession(user, oldToken, newToken, req) {
  const now = new Date();
  const oldHash = hashToken(oldToken);
  const sessions = user.refreshSessions || [];
  let match = sessions.find((s) => s.hash === oldHash && s.expiresAt > now);

  // Accounts signed in before per-device sessions existed carry a single legacy token.
  if (!match && user.refreshToken && user.refreshToken === oldToken) {
    match = { family: crypto.randomUUID() };
    await User.updateOne({ _id: user._id }, { $unset: { refreshToken: 1 } });
  }
  if (!match) return false;

  const graceUntil = new Date(now.getTime() + ROTATION_GRACE_MS);
  await User.updateOne(
    { _id: user._id, 'refreshSessions.hash': oldHash },
    { $min: { 'refreshSessions.$.expiresAt': graceUntil } },
  );
  await User.updateOne(
    { _id: user._id },
    { $push: { refreshSessions: { $each: [tokenEntry(newToken, match.family, req)], $slice: -MAX_TOKENS } } },
  );
  await User.updateOne({ _id: user._id }, { $pull: { refreshSessions: { expiresAt: { $lt: now } } } });
  return true;
}

async function endSession(userId, token) {
  if (!token) return;
  const user = await User.findById(userId).select('+refreshSessions');
  const entry = user?.refreshSessions?.find((s) => s.hash === hashToken(token));
  if (!entry) return;
  await User.updateOne({ _id: userId }, { $pull: { refreshSessions: { family: entry.family } } });
}

async function endAllSessions(userId) {
  await User.updateOne({ _id: userId }, { $set: { refreshSessions: [] }, $unset: { refreshToken: 1 } });
}

module.exports = { startSession, rotateSession, endSession, endAllSessions };
