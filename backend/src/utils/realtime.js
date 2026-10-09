const Notification = require('../models/Notification');
const User = require('../models/User');

const MANAGEMENT_ROLES = ['SUPER_ADMIN', 'WARDEN', 'STAFF'];
const roleRooms = (roles) => roles.map((role) => `role_${role}`);

// Hostel rooms also contain students, so anything carrying another student's data
// must go through role rooms (management) or user rooms (the owner), never hostel rooms.
function toRoles(io, roles, event, payload) {
  if (!io || !roles.length) return;
  io.to(roleRooms(roles)).emit(event, payload);
}

function toManagement(io, event, payload) {
  toRoles(io, MANAGEMENT_ROLES, event, payload);
}

function toUser(io, userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user_${userId._id || userId}`).emit(event, payload);
}

async function notifyUsers(io, recipientIds, fields) {
  const ids = [...new Set(recipientIds.filter(Boolean).map((id) => String(id._id || id)))];
  if (!ids.length) return [];
  try {
    const docs = await Notification.insertMany(ids.map((recipientId) => ({ ...fields, recipientId })));
    docs.forEach((doc) => toUser(io, doc.recipientId, 'notification:new', doc));
    return docs;
  } catch (error) {
    console.error('Failed to send notification:', error.message);
    return [];
  }
}

function notifyUser(io, recipientId, fields) {
  return notifyUsers(io, [recipientId], fields);
}

async function notifyRoles(io, roles, fields, { exclude } = {}) {
  try {
    const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id').lean();
    const ids = users.map((u) => u._id).filter((id) => !exclude || String(id) !== String(exclude));
    return notifyUsers(io, ids, fields);
  } catch (error) {
    console.error('Failed to notify roles:', error.message);
    return [];
  }
}

function revokeSessions(io, userId) {
  if (!io || !userId) return;
  const room = `user_${userId._id || userId}`;
  io.to(room).emit('session:revoked', { reason: 'Your account has been deactivated.' });
  setTimeout(() => io.in(room).disconnectSockets(true), 500);
}

module.exports = {
  MANAGEMENT_ROLES,
  toRoles,
  toManagement,
  toUser,
  notifyUser,
  notifyUsers,
  notifyRoles,
  revokeSessions,
};
