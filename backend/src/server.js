const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const { connectDB } = require('./config/database');
const { setupSocket } = require('./sockets');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const hostelRoutes = require('./routes/hostelRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const feeRoutes = require('./routes/feeRoutes');
const gatePassRoutes = require('./routes/gatePassRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app);

// Socket.IO
const io = new Server(server, {
  cors: { origin: config.corsOrigin, credentials: true },
});
setupSocket(io);
app.set('io', io);

// Global middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Global rate limiter
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'SHMS API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/gate-passes', gatePassRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start
const start = async () => {
  await connectDB();
  server.listen(config.port, () => {
    console.log(`\n🚀 SHMS Backend running on http://localhost:${config.port}`);
    console.log(`📡 Socket.IO ready`);
    console.log(`🌍 Environment: ${config.nodeEnv}\n`);
  });
};

start();

module.exports = { app, server };
