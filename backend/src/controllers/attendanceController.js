const QRCode = require('qrcode');
const Attendance = require('../models/Attendance');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const { isWithinGeofence, paginateQuery } = require('../utils/helpers');
const crypto = require('crypto');

// Generate time-bound QR token
exports.generateQR = async (req, res) => {
  try {
    const { hostelId } = req.body;
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) return res.status(404).json({ success: false, message: 'Hostel not found' });

    const token = crypto.randomBytes(32).toString('hex');
    const payload = { hostelId, token, createdAt: Date.now(), expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(payload));

    // Store token temporarily (in production, use Redis)
    if (!global.qrTokens) global.qrTokens = new Map();
    global.qrTokens.set(token, { ...payload, used: false });

    // Clean expired tokens
    for (const [k, v] of global.qrTokens) {
      if (v.expiresAt < Date.now()) global.qrTokens.delete(k);
    }

    res.status(200).json({ success: true, message: 'QR generated', data: { qrDataUrl, token, expiresAt: payload.expiresAt } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// Mark attendance via QR scan
exports.markAttendanceQR = async (req, res) => {
  try {
    const { token, latitude, longitude } = req.body;
    const studentId = req.user.userId;

    if (!global.qrTokens || !global.qrTokens.has(token)) {
      return res.status(400).json({ success: false, message: 'Invalid or expired QR token' });
    }
    const qrData = global.qrTokens.get(token);
    if (qrData.expiresAt < Date.now()) {
      global.qrTokens.delete(token);
      return res.status(400).json({ success: false, message: 'QR code expired' });
    }

    // Geofence validation
    const hostel = await Hostel.findById(qrData.hostelId);
    if (hostel && latitude && longitude) {
      const inRange = isWithinGeofence(latitude, longitude, hostel.geoLocation.latitude, hostel.geoLocation.longitude, hostel.geoLocation.radiusMeters);
      if (!inRange) return res.status(400).json({ success: false, message: 'You are outside the hostel geofence' });
    }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    let attendance = await Attendance.findOne({ studentId, date: today });
    if (attendance) {
      attendance.checkIn = new Date();
      attendance.isPresent = true;
      attendance.method = 'QR_SCAN';
      attendance.qrToken = token;
      if (latitude) attendance.geoLocation = { latitude, longitude };
    } else {
      attendance = new Attendance({
        studentId, hostelId: qrData.hostelId, date: today,
        checkIn: new Date(), method: 'QR_SCAN', isPresent: true,
        qrToken: token, geoLocation: latitude ? { latitude, longitude } : undefined,
      });
    }
    await attendance.save();

    res.status(200).json({ success: true, message: 'Attendance marked', data: { attendance } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// Mark attendance manually (by warden)
exports.markAttendanceManual = async (req, res) => {
  try {
    const { studentId, hostelId, isPresent, remarks } = req.body;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date: today },
      { studentId, hostelId, date: today, isPresent, method: 'MANUAL', verifiedBy: req.user.userId, remarks, checkIn: isPresent ? new Date() : undefined },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, message: 'Attendance recorded', data: { attendance } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// Get attendance for a student
exports.getStudentAttendance = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.userId;
    const { startDate, endDate, page = 1, limit = 30 } = req.query;
    const filter = { studentId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const { skip } = paginateQuery(Number(page), Number(limit));
    const [records, total] = await Promise.all([
      Attendance.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Attendance.countDocuments(filter),
    ]);

    // Calculate percentage
    const presentCount = await Attendance.countDocuments({ ...filter, isPresent: true });
    const percentage = total > 0 ? ((presentCount / total) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true, message: 'Attendance retrieved',
      data: { records, percentage: Number(percentage), presentCount, totalDays: total },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// Get hostel attendance summary
exports.getHostelAttendance = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const summary = await Attendance.aggregate([
      { $match: { hostelId: new (require('mongoose').Types.ObjectId)(hostelId), date: today } },
      { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: ['$isPresent', 1, 0] } } } },
    ]);

    // Low attendance alerts
    const lowAttendance = await Attendance.aggregate([
      { $match: { hostelId: new (require('mongoose').Types.ObjectId)(hostelId) } },
      { $group: { _id: '$studentId', totalDays: { $sum: 1 }, presentDays: { $sum: { $cond: ['$isPresent', 1, 0] } } } },
      { $project: { percentage: { $multiply: [{ $divide: ['$presentDays', '$totalDays'] }, 100] }, totalDays: 1, presentDays: 1 } },
      { $match: { percentage: { $lt: 75 } } },
      { $sort: { percentage: 1 } },
    ]);

    res.status(200).json({
      success: true, message: 'Hostel attendance',
      data: { today: summary[0] || { total: 0, present: 0 }, lowAttendanceStudents: lowAttendance },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
