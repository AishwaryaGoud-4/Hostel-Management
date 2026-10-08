function hostelIdOf(value) {
  if (!value) return null;
  if (value._id) return value._id.toString();
  return value.toString();
}

/**
 * Push room and student changes to Admin, Warden, and the affected Student.
 */
function emitRoomSync(io, { type = 'room:updated', user, room, hostelId }) {
  if (!io) return;

  const userJson = user?.toJSON ? user.toJSON() : user || null;
  const payload = {
    type,
    user: userJson,
    student: userJson,
    room: room || null,
    at: new Date().toISOString(),
  };

  io.to('role_WARDEN').emit(type, payload);
  io.to('role_SUPER_ADMIN').emit(type, payload);
  io.to('role_WARDEN').emit('room:updated', payload);
  io.to('role_SUPER_ADMIN').emit('room:updated', payload);

  const userId = userJson?._id || userJson?.id;
  if (userId) io.to(`user_${userId}`).emit(type, payload);
  if (userId) io.to(`user_${userId}`).emit('room:updated', payload);

  const hid = hostelIdOf(hostelId)
    || hostelIdOf(room?.hostelId)
    || hostelIdOf(userJson?.studentProfile?.hostelId);
  if (hid) {
    io.to(`hostel_${hid}`).emit('room:updated', payload);
    io.to(`hostel_${hid}`).emit(type, payload);
  }
}

module.exports = { emitRoomSync };
