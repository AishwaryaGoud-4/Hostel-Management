const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../models/User');
const Hostel = require('../models/Hostel');

const setupSocket = (io) => {
  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, config.jwt.accessSecret);
      socket.user = decoded;
      next();
    } catch (e) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    console.log(`🔌 User connected: ${socket.user.email} (${socket.user.role})`);

    // Join personal room
    socket.join(`user_${socket.user.userId}`);

    // Join role-based rooms
    socket.join(`role_${socket.user.role}`);

    // Auto-join hostel rooms based on role
    try {
      if (socket.user.role === 'WARDEN') {
        // Find hostels managed by this warden
        const hostels = await Hostel.find({ wardenId: socket.user.userId, isActive: true });
        hostels.forEach(h => {
          socket.join(`hostel_${h._id}`);
          console.log(`  → Warden ${socket.user.email} auto-joined hostel_${h._id} (${h.name})`);
        });
      } else if (socket.user.role === 'STUDENT') {
        // Find student's hostel
        const student = await User.findById(socket.user.userId);
        if (student?.studentProfile?.hostelId) {
          socket.join(`hostel_${student.studentProfile.hostelId}`);
          console.log(`  → Student ${socket.user.email} auto-joined hostel_${student.studentProfile.hostelId}`);
        }
      } else if (socket.user.role === 'SUPER_ADMIN') {
        // Admin joins all hostels
        const allHostels = await Hostel.find({ isActive: true });
        allHostels.forEach(h => {
          socket.join(`hostel_${h._id}`);
        });
        console.log(`  → Admin ${socket.user.email} joined all ${allHostels.length} hostel rooms`);
      }
    } catch (err) {
      console.error('  ⚠ Error auto-joining hostel rooms:', err.message);
    }

    // Manual hostel join (backup)
    socket.on('join:hostel', (hostelId) => {
      socket.join(`hostel_${hostelId}`);
      console.log(`  → ${socket.user.email} joined hostel_${hostelId}`);
    });

    // Emergency SOS
    socket.on('emergency:sos', (data) => {
      io.to('role_SUPER_ADMIN').to('role_WARDEN').emit('emergency:sos', {
        ...data,
        from: socket.user,
        timestamp: new Date(),
      });
      console.log(`🚨 SOS from ${socket.user.email}:`, data);
    });

    // Typing indicators for live chat
    socket.on('typing:start', (data) => {
      socket.to(data.room).emit('typing:start', { userId: socket.user.userId, name: socket.user.email });
    });

    socket.on('typing:stop', (data) => {
      socket.to(data.room).emit('typing:stop', { userId: socket.user.userId });
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.user.email}`);
    });
  });

  return io;
};

module.exports = { setupSocket };
