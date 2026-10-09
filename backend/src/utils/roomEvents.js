const { toRoles, toUser } = require('./realtime');

/**
 * Push room and student changes to Admin, Warden, and the affected Student.
 * Payloads include student details, so they never go to hostel rooms (other students).
 */
function emitRoomSync(io, { type = 'room:updated', user, room }) {
  if (!io) return;

  const userJson = user?.toJSON ? user.toJSON() : user || null;
  const payload = {
    type,
    user: userJson,
    student: userJson,
    room: room || null,
    at: new Date().toISOString(),
  };

  const management = ['SUPER_ADMIN', 'WARDEN'];
  toRoles(io, management, type, payload);
  if (type !== 'room:updated') toRoles(io, management, 'room:updated', payload);

  const userId = userJson?._id || userJson?.id;
  if (userId) {
    toUser(io, userId, type, payload);
    if (type !== 'room:updated') toUser(io, userId, 'room:updated', payload);
  }
}

module.exports = { emitRoomSync };
