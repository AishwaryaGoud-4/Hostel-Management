const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const config = require('../config');
const { isValidCourse } = require('../constants/courses');
const { allocateCourseRoom } = require('../services/courseRoomAllocation');
const { buildMyRoomResponse } = require('../utils/roomHelpers');
const { emitRoomSync } = require('../utils/roomEvents');
const { toManagement, toRoles, toUser, notifyRoles, revokeSessions } = require('../utils/realtime');
const { ensureCourseRooms } = require('../utils/ensureCourseRooms');
const { startSession, rotateSession, endSession, endAllSessions } = require('../utils/sessions');
const { NO_ROOMS_MESSAGE } = require('../constants/courses');

async function buildRegistrationRoomSummary(userId) {
  const user = await User.findById(userId);
  if (!user?.studentProfile?.roomId) return null;

  const room = await Room.findById(user.studentProfile.roomId).populate(
    'occupants',
    'firstName lastName studentProfile.course'
  );
  if (!room) return null;

  const hostel = await Hostel.findById(room.hostelId);
  const payload = buildMyRoomResponse({ room, hostel, user, studentUserId: user._id });
  return {
    roomId: payload.roomId,
    roomCode: payload.roomCode,
    roomNumber: payload.roomNumber,
    roomNo: payload.roomNo,
    course: payload.course,
    capacity: payload.capacity,
    occupied: payload.occupied,
    occupiedBeds: payload.occupied,
    availableBeds: payload.availableBeds,
    status: payload.status,
  };
}

const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiry });
  const refreshToken = jwt.sign({ ...payload, jti: crypto.randomUUID() }, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiry });
  return { accessToken, refreshToken };
};

const cookieBase = () => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
});
const REFRESH_COOKIE_PATH = '/api/auth';
const LEGACY_REFRESH_COOKIE_PATH = '/api/auth/refresh';

const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...cookieBase(), maxAge: 7 * 24 * 60 * 60 * 1000, path: REFRESH_COOKIE_PATH });
  // A cookie on the old, more specific path would shadow the new one on /refresh.
  res.clearCookie('refreshToken', { ...cookieBase(), path: LEGACY_REFRESH_COOKIE_PATH });
};

const clearTokenCookies = (res) => {
  res.clearCookie('accessToken', cookieBase());
  res.clearCookie('refreshToken', { ...cookieBase(), path: REFRESH_COOKIE_PATH });
  res.clearCookie('refreshToken', { ...cookieBase(), path: LEGACY_REFRESH_COOKIE_PATH });
};

exports.register = async (req, res) => {
  const effectiveRole = req.body?.role || 'STUDENT';
  if (effectiveRole === 'STUDENT') {
    const seeded = await ensureCourseRooms(req.body?.studentProfile?.course);
    if (!seeded.ok) {
      return res.status(400).json({ success: false, message: seeded.message });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { firstName, lastName, email, password, phone, role, studentProfile, staffProfile } = req.body;
    const effectiveRole = role || 'STUDENT';
    const isStudent = effectiveRole === 'STUDENT';

    const existing = await User.findOne({ email });
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    if (isStudent) {
      const course = studentProfile?.course;
      if (!isValidCourse(course)) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: 'Course is required. Choose CSE, ECE, EEE, BSC, or BBA.',
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await User.create(
      [{
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        role: effectiveRole,
        studentProfile: isStudent ? studentProfile : undefined,
        staffProfile: ['STAFF', 'WARDEN'].includes(effectiveRole) ? staffProfile : undefined,
      }],
      { session }
    );

    if (isStudent) {
      const allocation = await allocateCourseRoom(studentProfile.course, user._id, session);
      if (!allocation.ok) {
        await session.abortTransaction();
        return res.status(allocation.status || 400).json({
          success: false,
          message: allocation.message || NO_ROOMS_MESSAGE,
        });
      }
    }

    await session.commitTransaction();

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const { accessToken, refreshToken } = generateTokens(payload);

    await startSession(user._id, refreshToken, req);
    setTokenCookies(res, accessToken, refreshToken);

    const populatedUser = await User.findById(user._id)
      .populate('studentProfile.hostelId', 'name code')
      .populate('studentProfile.roomId', 'roomNumber roomNo floor type course capacity block status');

    let roomSummary = null;
    if (isStudent) {
      roomSummary = await buildRegistrationRoomSummary(user._id);
      if (!roomSummary?.roomId) {
        return res.status(500).json({
          success: false,
          message: 'Registration completed but room allocation data is missing. Please contact the administrator.',
        });
      }
    }

    const io = req.app.get('io');
    if (io) {
      const userJson = populatedUser.toJSON();
      if (user.role === 'STUDENT') {
        toManagement(io, 'student:registered', userJson);
        toManagement(io, 'student:added', userJson);
        await notifyRoles(io, ['SUPER_ADMIN', 'WARDEN'], {
          senderId: user._id, type: 'ROOM',
          title: 'New student registered',
          message: `${userJson.firstName} ${userJson.lastName} (${userJson.studentProfile?.course || 'student'}) joined${roomSummary?.roomId ? ` · room ${roomSummary.roomId}` : ''}.`,
          data: { userId: user._id },
        });
      }
      toRoles(io, ['SUPER_ADMIN'], 'user:added', userJson);
      if (isStudent && roomSummary) {
        emitRoomSync(io, {
          type: 'room:allocated',
          user: populatedUser,
          room: roomSummary,
          hostelId: userJson.studentProfile?.hostelId,
        });
      }
    }

    const studentName = `${firstName} ${lastName}`.trim();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      student: isStudent
        ? { name: studentName, course: studentProfile.course }
        : undefined,
      room: roomSummary,
      data: {
        user: populatedUser,
        accessToken,
        room: roomSummary,
        student: isStudent ? { name: studentName, course: studentProfile.course } : undefined,
      },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
  } finally {
    session.endSession();
  }
};

exports.createStudent = async (req, res) => {
  const coursePreview = req.body?.studentProfile?.course;
  if (isValidCourse(coursePreview)) {
    const seeded = await ensureCourseRooms(coursePreview);
    if (!seeded.ok) {
      return res.status(400).json({ success: false, message: seeded.message });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { firstName, lastName, email, password, phone, studentProfile } = req.body;
    if (!firstName || !lastName || !email || !password || !phone) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Name, email, phone, and password are required.' });
    }
    if (String(password).length < 8) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const course = studentProfile?.course;
    if (!isValidCourse(course)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Course is required. Choose CSE, ECE, EEE, BSC, or BBA.',
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await User.create(
      [{
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        role: 'STUDENT',
        studentProfile,
      }],
      { session }
    );

    const allocation = await allocateCourseRoom(course, user._id, session);
    if (!allocation.ok) {
      await session.abortTransaction();
      return res.status(allocation.status || 400).json({
        success: false,
        message: allocation.message || NO_ROOMS_MESSAGE,
      });
    }

    await session.commitTransaction();

    const populatedUser = await User.findById(user._id)
      .populate('studentProfile.hostelId', 'name code')
      .populate('studentProfile.roomId', 'roomNumber roomNo floor type course capacity block status');
    const roomSummary = await buildRegistrationRoomSummary(user._id);
    if (!roomSummary?.roomId) {
      return res.status(500).json({
        success: false,
        message: 'Student was created but room allocation data is missing. Please contact the administrator.',
      });
    }

    const io = req.app.get('io');
    if (io) {
      const userJson = populatedUser.toJSON();
      toManagement(io, 'student:registered', userJson);
      toManagement(io, 'student:added', userJson);
      toRoles(io, ['SUPER_ADMIN'], 'user:added', userJson);
      const hid = userJson.studentProfile?.hostelId?._id || userJson.studentProfile?.hostelId;
      emitRoomSync(io, {
        type: 'room:allocated',
        user: populatedUser,
        room: roomSummary,
        hostelId: hid,
      });
    }

    const studentName = `${firstName} ${lastName}`.trim();
    res.status(201).json({
      success: true,
      message: 'Student added and room allocated',
      student: { name: studentName, course },
      room: roomSummary,
      data: { user: populatedUser, room: roomSummary, student: { name: studentName, course } },
    });
  } catch (error) {
    if (session.inTransaction()) await session.abortTransaction();
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Could not add student', error: error.message });
    }
  } finally {
    session.endSession();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: String(email || '').toLowerCase().trim(), isActive: true }).select('+password');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const { accessToken, refreshToken } = generateTokens(payload);

    await startSession(user._id, refreshToken, req);
    setTokenCookies(res, accessToken, refreshToken);

    const populatedUser = await User.findById(user._id)
      .populate('studentProfile.hostelId', 'name code')
      .populate('studentProfile.roomId', 'roomNumber roomNo floor type course capacity block status');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { user: populatedUser || user.toJSON(), accessToken },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    const user = await User.findById(decoded.userId).select('+refreshToken +refreshSessions');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    if (user.isActive === false) {
      clearTokenCookies(res);
      return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    }

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const { accessToken, refreshToken: newRefresh } = generateTokens(payload);
    if (!(await rotateSession(user, token, newRefresh, req))) {
      clearTokenCookies(res);
      return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
    }
    setTokenCookies(res, accessToken, newRefresh);

    res.status(200).json({ success: true, message: 'Token refreshed', data: { accessToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Refresh failed', error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, config.jwt.refreshSecret, { ignoreExpiration: true });
        await endSession(decoded.userId, token);
      } catch { /* an invalid token has no session to end */ }
    }
    clearTokenCookies(res);
    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('studentProfile.hostelId', 'name code')
      .populate('studentProfile.roomId', 'roomNumber roomNo floor type course capacity block status occupants');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isActive === false) return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    res.status(200).json({ success: true, message: 'Profile retrieved', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get profile', error: error.message });
  }
};

exports.resetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ success: true, message: 'If email exists, reset link sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const exposeToken = config.nodeEnv !== 'production';
    res.status(200).json({
      success: true,
      message: 'If email exists, reset link sent.',
      data: exposeToken ? { resetToken } : undefined,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Reset request failed', error: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token' });

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();
    await endAllSessions(user._id);

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Reset failed', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20, course, unassigned } = req.query;
    const filter = {};
    const and = [];
    if (role) filter.role = role;
    if (course) filter['studentProfile.course'] = course;
    if (search) {
      and.push({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { 'studentProfile.rollNumber': { $regex: search, $options: 'i' } },
          { 'studentProfile.roomCode': { $regex: search, $options: 'i' } },
          { 'studentProfile.roomNumber': { $regex: search, $options: 'i' } },
        ],
      });
    }
    if (unassigned === 'true') {
      and.push({
        $or: [
          { 'studentProfile.roomId': null },
          { 'studentProfile.roomId': { $exists: false } },
        ],
      });
    }
    if (and.length) filter.$and = and;
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('studentProfile.roomId', 'roomNumber roomNo course capacity status')
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, message: 'Users retrieved', data: { users },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password;
    delete updates.refreshToken;
    delete updates.refreshSessions;
    delete updates.passwordResetToken;
    delete updates.passwordResetExpiry;
    const before = await User.findById(req.params.id).select('role isActive');
    if (!before) return res.status(404).json({ success: false, message: 'User not found' });
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Tokens embed the role, so a role change needs a fresh sign-in.
    const mustSignOut = user.isActive === false || before.role !== user.role;
    if (mustSignOut) await endAllSessions(user._id);

    const io = req.app.get('io');
    if (io) {
      toUser(io, user._id, 'user:updated', user.toJSON());
      if (user.role === 'STUDENT' || before.role === 'STUDENT') toManagement(io, 'student:updated', user.toJSON());
      toRoles(io, ['SUPER_ADMIN'], 'user:updated', user.toJSON());
      if (mustSignOut) revokeSessions(io, user._id);
    }

    res.status(200).json({ success: true, message: 'User updated', data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed', error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    await endAllSessions(user._id);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      if (user.role === 'STUDENT') toManagement(io, 'student:removed', { userId: user._id });
      toRoles(io, ['SUPER_ADMIN'], 'user:removed', { userId: user._id });
      revokeSessions(io, user._id);
    }

    res.status(200).json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed', error: error.message });
  }
};
