const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const { notifyRoles, MANAGEMENT_ROLES } = require('../utils/realtime');

const setupSocket = (io) => {
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.accessSecret);
    } catch {
      return next(new Error('Invalid token'));
    }
    try {
      const user = await User.findById(decoded.userId).select('isActive role studentProfile.hostelId firstName lastName');
      if (!user || user.isActive === false) return next(new Error('Account inactive'));
      socket.user = decoded;
      socket.account = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId, role, email } = socket.user;
    console.log(`🔌 User connected: ${email} (${role})`);

    socket.join(`user_${userId}`);
    socket.join(`role_${role}`);

    try {
      if (role === 'WARDEN') {
        const hostels = await Hostel.find({ wardenId: userId, isActive: true }).select('_id');
        hostels.forEach((h) => socket.join(`hostel_${h._id}`));
      } else if (role === 'SUPER_ADMIN' || role === 'STAFF') {
        const hostels = await Hostel.find({ isActive: true }).select('_id');
        hostels.forEach((h) => socket.join(`hostel_${h._id}`));
      } else if (role === 'STUDENT' && socket.account.studentProfile?.hostelId) {
        socket.join(`hostel_${socket.account.studentProfile.hostelId}`);
      }
    } catch (err) {
      console.error('  ⚠ Error auto-joining hostel rooms:', err.message);
    }

    socket.on('join:hostel', (hostelId) => {
      if (!MANAGEMENT_ROLES.includes(role) || !hostelId) return;
      socket.join(`hostel_${hostelId}`);
    });

    socket.on('emergency:sos', async (data = {}, ack) => {
      const name = `${socket.account.firstName} ${socket.account.lastName}`.trim();
      const alert = {
        message: String(data.message || 'Emergency! Immediate help needed.').slice(0, 300),
        location: data.location ? String(data.location).slice(0, 120) : undefined,
        from: { userId, email, role, name },
        timestamp: new Date(),
      };
      io.to(MANAGEMENT_ROLES.map((r) => `role_${r}`)).emit('emergency:sos', alert);
      await notifyRoles(io, MANAGEMENT_ROLES, {
        senderId: userId, type: 'EMERGENCY',
        title: `SOS from ${name || email}`,
        message: alert.location ? `${alert.message} · ${alert.location}` : alert.message,
        data: { from: alert.from },
      });
      console.log(`🚨 SOS from ${email}:`, alert.message);
      if (typeof ack === 'function') ack({ ok: true });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${email}`);
    });
  });

  return io;
};

module.exports = { setupSocket };
