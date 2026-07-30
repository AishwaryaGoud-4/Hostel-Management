const QRCode = require('qrcode');
const Attendance = require('../models/Attendance');
const Hostel = require('../models/Hostel');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { isWithinGeofence, paginateQuery } = require('../utils/helpers');
const crypto = require('crypto');

// ── Helper: send real-time notification ──────────────────────────────────
const sendAttendanceNotification = async (io, studentId, status, date, markedBy) => {
  const statusLabels = { PRESENT: '✅ Present', ABSENT: '❌ Absent', ON_LEAVE: '🟡 On Leave', LATE: '⏰ Late' };
  const dateStr = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Persist notification
  const notification = await Notification.create({
    recipientId: studentId,
    senderId: markedBy,
    type: 'ATTENDANCE',
    title: `Attendance: ${statusLabels[status] || status}`,
    message: `Your attendance for ${dateStr} has been marked as ${status}.`,
    data: { status, date },
    link: '/dashboard/student/attendance',
  });

  // Push via Socket.IO
  if (io) {
    io.to(`user_${studentId}`).emit('notification:new', notification);
    io.to(`user_${studentId}`).emit('attendance:updated', { studentId, status, date });
  }
};

// ── Generate time-bound QR token ─────────────────────────────────────────
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

// ── Mark attendance via QR scan ──────────────────────────────────────────
exports.markAttendanceQR = async (req, res) => {
  try {
    const { token, latitude, longitude } = req.body;
    const studentId = req.user.userId;
    const io = req.app.get('io');

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
      attendance.status = 'PRESENT';
      attendance.isPresent = true;
      attendance.method = 'QR_SCAN';
      attendance.qrToken = token;
      if (latitude) attendance.geoLocation = { latitude, longitude };
    } else {
      attendance = new Attendance({
        studentId, hostelId: qrData.hostelId, date: today,
        checkIn: new Date(), method: 'QR_SCAN', status: 'PRESENT', isPresent: true,
        qrToken: token, geoLocation: latitude ? { latitude, longitude } : undefined,
      });
    }
    await attendance.save();

    // Notify warden in real-time
    if (io && hostel) {
      io.to(`hostel_${hostel._id}`).emit('attendance:student-marked', {
        studentId, status: 'PRESENT', method: 'QR_SCAN', date: today,
      });
    }

    res.status(200).json({ success: true, message: 'Attendance marked', data: { attendance } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Mark attendance manually (single student, by warden) ─────────────────
exports.markAttendanceManual = async (req, res) => {
  try {
    const { studentId, hostelId, status, isPresent, remarks } = req.body;
    const io = req.app.get('io');
    const today = new Date(); today.setHours(0, 0, 0, 0);

    // Support both old `isPresent` flag and new `status` field
    const attendanceStatus = status || (isPresent ? 'PRESENT' : 'ABSENT');

    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date: today },
      {
        studentId, hostelId, date: today,
        status: attendanceStatus,
        isPresent: attendanceStatus === 'PRESENT' || attendanceStatus === 'LATE',
        method: 'MANUAL',
        verifiedBy: req.user.userId,
        remarks,
        checkIn: (attendanceStatus === 'PRESENT' || attendanceStatus === 'LATE') ? new Date() : undefined,
      },
      { upsert: true, new: true }
    );

    // Send real-time notification to the student
    await sendAttendanceNotification(io, studentId, attendanceStatus, today, req.user.userId);

    // Notify warden dashboard listeners
    if (io) {
      io.to(`hostel_${hostelId}`).emit('attendance:updated', { studentId, status: attendanceStatus, date: today });
    }

    res.status(200).json({ success: true, message: 'Attendance recorded', data: { attendance } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Bulk mark attendance (multiple students at once, by warden) ──────────
exports.markBulkAttendance = async (req, res) => {
  try {
    const { hostelId, records } = req.body;
    // records = [{ studentId, status, remarks? }, ...]
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ success: false, message: 'No records provided' });
    }

    const io = req.app.get('io');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const results = [];

    for (const rec of records) {
      const attendanceStatus = rec.status || 'ABSENT';
      const attendance = await Attendance.findOneAndUpdate(
        { studentId: rec.studentId, date: today },
        {
          studentId: rec.studentId,
          hostelId,
          date: today,
          status: attendanceStatus,
          isPresent: attendanceStatus === 'PRESENT' || attendanceStatus === 'LATE',
          method: 'BULK',
          verifiedBy: req.user.userId,
          remarks: rec.remarks || '',
          checkIn: (attendanceStatus === 'PRESENT' || attendanceStatus === 'LATE') ? new Date() : undefined,
        },
        { upsert: true, new: true }
      );
      results.push(attendance);

      // Send individual notification to each student
      await sendAttendanceNotification(io, rec.studentId, attendanceStatus, today, req.user.userId);
    }

    // Broadcast bulk update to hostel room
    if (io) {
      io.to(`hostel_${hostelId}`).emit('attendance:bulk-updated', {
        hostelId, date: today, count: results.length,
      });
    }

    res.status(200).json({
      success: true,
      message: `Attendance marked for ${results.length} students`,
      data: { count: results.length, records: results },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Get students under warden's hostel ───────────────────────────────────
exports.getWardenStudents = async (req, res) => {
  try {
    const wardenId = req.user.userId;
    const { search } = req.query;

    // Find hostels assigned to this warden
    const hostels = await Hostel.find({ wardenId, isActive: true });
    
    // Build query for students in these hostels
    const filter = {
      role: 'STUDENT',
      isActive: true,
    };

    // If warden has hostels, filter by them. Otherwise, for testing purposes, return all students.
    if (hostels.length > 0) {
      filter['studentProfile.hostelId'] = { $in: hostels.map(h => h._id) };
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'studentProfile.rollNumber': { $regex: search, $options: 'i' } },
      ];
    }

    const students = await User.find(filter)
      .populate('studentProfile.hostelId', 'name code')
      .populate('studentProfile.roomId', 'roomNumber floor')
      .sort({ firstName: 1, lastName: 1 });

    // Get today's attendance for these students
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const studentIds = students.map(s => s._id);
    const todayAttendance = await Attendance.find({
      studentId: { $in: studentIds },
      date: today,
    });

    const attendanceMap = {};
    todayAttendance.forEach(a => {
      attendanceMap[a.studentId.toString()] = a.status;
    });

    // Merge student data with today's attendance
    const studentsWithAttendance = students.map(s => ({
      ...s.toJSON(),
      todayStatus: attendanceMap[s._id.toString()] || null,
    }));

    res.status(200).json({
      success: true,
      message: 'Students retrieved',
      data: { students: studentsWithAttendance, hostels },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Get attendance for a student ─────────────────────────────────────────
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

    // Calculate overall percentage
    const presentCount = await Attendance.countDocuments({ studentId, isPresent: true });
    const totalAll = await Attendance.countDocuments({ studentId });
    const percentage = totalAll > 0 ? ((presentCount / totalAll) * 100).toFixed(1) : 0;

    // Monthly breakdown for analytics
    const monthlyStats = await Attendance.aggregate([
      { $match: { studentId: new (require('mongoose').Types.ObjectId)(studentId) } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          total: { $sum: 1 },
          present: { $sum: { $cond: ['$isPresent', 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$status', 'ON_LEAVE'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 },
    ]);

    // Today's status
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todayRecord = await Attendance.findOne({ studentId, date: today });

    res.status(200).json({
      success: true, message: 'Attendance retrieved',
      data: {
        records,
        percentage: Number(percentage),
        presentCount,
        totalDays: totalAll,
        monthlyStats: monthlyStats.reverse(),
        todayStatus: todayRecord?.status || null,
        todayRecord: todayRecord || null,
      },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Get hostel attendance summary ────────────────────────────────────────
exports.getHostelAttendance = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const summary = await Attendance.aggregate([
      { $match: { hostelId: new (require('mongoose').Types.ObjectId)(hostelId), date: today } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'PRESENT'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$status', 'ON_LEAVE'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'LATE'] }, 1, 0] } },
        },
      },
    ]);

    // Get individual records for today with student info
    const todayRecords = await Attendance.find({ hostelId, date: today })
      .populate('studentId', 'firstName lastName email studentProfile')
      .sort({ createdAt: -1 });

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
      data: {
        today: summary[0] || { total: 0, present: 0, absent: 0, onLeave: 0, late: 0 },
        todayRecords,
        lowAttendanceStudents: lowAttendance,
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
