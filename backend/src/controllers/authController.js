const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const config = require('../config');
const { isValidCourse } = require('../constants/courses');
const { allocateCourseRoom } = require('../services/courseRoomAllocation');

const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessExpiry });
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiry });
  return { accessToken, refreshToken };
};

const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
};

exports.register = async (req, res) => {
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
        return res.status(400).json({ success: false, message: allocation.message });
      }
    }

    await session.commitTransaction();

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const { accessToken, refreshToken } = generateTokens(payload);

    await User.findByIdAndUpdate(user._id, { refreshToken });
    setTokenCookies(res, accessToken, refreshToken);

    const populatedUser = await User.findById(user._id)
      .populate('studentProfile.hostelId', 'name code')
      .populate('studentProfile.roomId', 'roomNumber floor type course capacity');

    const io = req.app.get('io');
    if (io) {
      const userJson = populatedUser.toJSON();
      if (user.role === 'STUDENT') {
        io.to('role_WARDEN').emit('student:registered', userJson);
        if (userJson.studentProfile?.hostelId) {
          const hid = userJson.studentProfile.hostelId._id || userJson.studentProfile.hostelId;
          io.to(`hostel_${hid}`).emit('student:added', userJson);
        }
      }
      io.to('role_SUPER_ADMIN').emit('user:added', userJson);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: { user: populatedUser, accessToken },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  } finally {
    session.endSession();
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, isActive: true }).select('+password +refreshToken');
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const { accessToken, refreshToken } = generateTokens(payload);

    user.refreshToken = refreshToken;
    await user.save();
    setTokenCookies(res, accessToken, refreshToken);

    res.status(200).json({ success: true, message: 'Login successful', data: { user: user.toJSON(), accessToken } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies?.refreshToken || req.body.refreshToken;
    if (!token) return res.status(401).json({ success: false, message: 'Refresh token required' });

    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    const user = await User.findById(decoded.userId).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const payload = { userId: user._id.toString(), role: user.role, email: user.email };
    const { accessToken, refreshToken: newRefresh } = generateTokens(payload);
    user.refreshToken = newRefresh;
    await user.save();
    setTokenCookies(res, accessToken, newRefresh);

    res.status(200).json({ success: true, message: 'Token refreshed', data: { accessToken } });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Refresh failed', error: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user) await User.findByIdAndUpdate(req.user.userId, { refreshToken: null });
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.status(200).json({ success: true, message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Logout failed', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('studentProfile.hostelId', 'name code')
      .populate('studentProfile.roomId', 'roomNumber floor type course capacity');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
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

    res.status(200).json({ success: true, message: 'Reset token generated', data: { resetToken } });
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
    user.refreshToken = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Reset failed', error: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
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
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${user._id}`).emit('user:updated', user.toJSON());
      if (user.role === 'STUDENT' && user.studentProfile?.hostelId) {
        io.to(`hostel_${user.studentProfile.hostelId}`).emit('student:updated', user.toJSON());
      }
      io.to('role_SUPER_ADMIN').emit('user:updated', user.toJSON());
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

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      if (user.role === 'STUDENT' && user.studentProfile?.hostelId) {
        io.to(`hostel_${user.studentProfile.hostelId}`).emit('student:removed', { userId: user._id });
      }
      io.to('role_SUPER_ADMIN').emit('user:removed', { userId: user._id });
    }

    res.status(200).json({ success: true, message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Delete failed', error: error.message });
  }
};
