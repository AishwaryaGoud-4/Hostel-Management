const User = require('../models/User');
const Room = require('../models/Room');
const Hostel = require('../models/Hostel');
const Complaint = require('../models/Complaint');
const Attendance = require('../models/Attendance');
const FeeTransaction = require('../models/FeeTransaction');
const LeaveRequest = require('../models/LeaveRequest');
const GatePass = require('../models/GatePass');
const ActivityLog = require('../models/ActivityLog');

// ── Advanced Analytics ───────────────────────────────────────────────────
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Run all aggregations in parallel
    const [
      totalStudents, totalRooms, totalHostels, totalStaff,
      occupancyStats, monthlyAttendance, complaintsByStatus,
      complaintsByCategory, feeCollection, monthlyFees,
      leaveStats, visitorStats, monthlyStudentGrowth,
      recentActivity,
    ] = await Promise.all([
      User.countDocuments({ role: 'STUDENT', isActive: true }),
      Room.countDocuments(),
      Hostel.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'STAFF', isActive: true }),

      // Occupancy
      Room.aggregate([
        { $group: { _id: null, totalCapacity: { $sum: '$capacity' }, totalOccupants: { $sum: { $size: '$occupants' } } } },
      ]),

      // Monthly attendance (last 12 months)
      Attendance.aggregate([
        { $match: { date: { $gte: startOfYear } } },
        { $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' } },
          total: { $sum: 1 },
          present: { $sum: { $cond: ['$isPresent', 1, 0] } },
          absent: { $sum: { $cond: [{ $not: '$isPresent' }, 1, 0] } },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Complaints by status
      Complaint.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

      // Complaints by category
      Complaint.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),

      // Total fee collection
      FeeTransaction.aggregate([
        { $group: { _id: null, totalBilled: { $sum: '$totalAmount' }, totalCollected: { $sum: '$paidAmount' }, totalPending: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } },
      ]),

      // Monthly fee collection
      FeeTransaction.aggregate([
        { $unwind: '$payments' },
        { $match: { 'payments.paidAt': { $gte: startOfYear } } },
        { $group: {
          _id: { month: { $month: '$payments.paidAt' }, year: { $year: '$payments.paidAt' } },
          amount: { $sum: '$payments.amount' },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Leave stats
      LeaveRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

      // Visitor/gate pass stats (monthly)
      GatePass.aggregate([
        { $match: { createdAt: { $gte: startOfYear } } },
        { $group: {
          _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
          count: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
        }},
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Student growth (monthly registrations)
      User.aggregate([
        { $match: { role: 'STUDENT', createdAt: { $gte: startOfYear } } },
        { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),

      // Recent activity
      ActivityLog.find().populate('userId', 'firstName lastName role').sort({ createdAt: -1 }).limit(20),
    ]);

    // Room usage breakdown
    const roomUsage = await Room.aggregate([{ $group: { _id: '$type', count: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ['$status', 'OCCUPIED'] }, 1, 0] } } } }]);

    // Electricity consumption (from rooms)
    const electricityData = await Room.aggregate([
      { $match: { 'utilityUsage.electricity': { $gt: 0 } } },
      { $group: { _id: '$hostelId', totalElectricity: { $sum: '$utilityUsage.electricity' }, totalWater: { $sum: '$utilityUsage.water' } } },
    ]);

    const occ = occupancyStats[0] || { totalCapacity: 0, totalOccupants: 0 };
    const fee = feeCollection[0] || { totalBilled: 0, totalCollected: 0, totalPending: 0 };

    res.status(200).json({
      success: true, message: 'Analytics data',
      data: {
        overview: {
          totalStudents, totalRooms, totalHostels, totalStaff,
          occupancyRate: occ.totalCapacity > 0 ? ((occ.totalOccupants / occ.totalCapacity) * 100).toFixed(1) : 0,
          totalCapacity: occ.totalCapacity, occupiedBeds: occ.totalOccupants,
        },
        fees: { ...fee, monthlyTrend: monthlyFees },
        attendance: { monthlyTrend: monthlyAttendance },
        complaints: { byStatus: complaintsByStatus, byCategory: complaintsByCategory },
        leaves: leaveStats,
        visitors: visitorStats,
        rooms: { usage: roomUsage, electricity: electricityData },
        studentGrowth: monthlyStudentGrowth,
        recentActivity,
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── AI Predictions ───────────────────────────────────────────────────────
exports.getAIPredictions = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    // Room availability prediction
    const rooms = await Room.find();
    const totalCapacity = rooms.reduce((s, r) => s + r.capacity, 0);
    const totalOccupied = rooms.reduce((s, r) => s + r.occupants.length, 0);
    const occupancyRate = totalCapacity > 0 ? (totalOccupied / totalCapacity) : 0;
    const roomPrediction = {
      title: 'Room Availability Forecast',
      prediction: occupancyRate > 0.9 ? 'Rooms will be full within 2 weeks' : occupancyRate > 0.7 ? 'Moderate availability — 30% free' : 'Plenty of rooms available',
      confidence: Math.min(95, Math.round(60 + occupancyRate * 35)),
      metric: `${((1 - occupancyRate) * 100).toFixed(0)}% Available`,
      trend: occupancyRate > 0.8 ? 'rising' : 'stable',
      action: occupancyRate > 0.9 ? 'Consider opening new hostel blocks' : 'No action needed',
      value: ((1 - occupancyRate) * 100).toFixed(1),
    };

    // Attendance risk prediction
    const recentAttendance = await Attendance.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      { $group: { _id: '$studentId', total: { $sum: 1 }, present: { $sum: { $cond: ['$isPresent', 1, 0] } } } },
      { $project: { percentage: { $multiply: [{ $divide: ['$present', '$total'] }, 100] } } },
    ]);
    const atRisk = recentAttendance.filter(s => s.percentage < 75).length;
    const attendancePrediction = {
      title: 'Attendance Risk Assessment',
      prediction: atRisk > 10 ? `${atRisk} students at risk of falling below 75%` : atRisk > 0 ? `${atRisk} students need attention` : 'All students have healthy attendance',
      confidence: Math.min(92, Math.round(70 + Math.min(atRisk, 20))),
      metric: `${atRisk} At Risk`,
      trend: atRisk > 5 ? 'rising' : 'stable',
      action: atRisk > 5 ? 'Send attendance reminders to at-risk students' : 'Monitor regularly',
      value: atRisk,
    };

    // Fee payment delay prediction
    const overdueCount = await FeeTransaction.countDocuments({ status: { $in: ['OVERDUE', 'PENDING'] }, dueDate: { $lt: now } });
    const totalFees = await FeeTransaction.countDocuments();
    const delayRate = totalFees > 0 ? (overdueCount / totalFees) : 0;
    const feePrediction = {
      title: 'Fee Payment Forecast',
      prediction: delayRate > 0.3 ? 'High risk of payment delays this month' : delayRate > 0.1 ? 'Some students may delay payments' : 'Payments are on track',
      confidence: Math.min(88, Math.round(65 + delayRate * 50)),
      metric: `${overdueCount} Overdue`,
      trend: delayRate > 0.2 ? 'rising' : 'stable',
      action: delayRate > 0.2 ? 'Send bulk fee reminders' : 'Continue monitoring',
      value: overdueCount,
    };

    // Electricity consumption prediction
    const totalElectricity = rooms.reduce((s, r) => s + (r.utilityUsage?.electricity || 0), 0);
    const avgPerRoom = rooms.length > 0 ? totalElectricity / rooms.length : 0;
    const electricityPrediction = {
      title: 'Energy Consumption Forecast',
      prediction: avgPerRoom > 200 ? 'High energy usage detected — costs may spike' : avgPerRoom > 100 ? 'Moderate energy consumption' : 'Energy usage is efficient',
      confidence: Math.min(85, Math.round(60 + Math.min(avgPerRoom / 5, 25))),
      metric: `${totalElectricity.toFixed(0)} kWh Total`,
      trend: avgPerRoom > 150 ? 'rising' : 'stable',
      action: avgPerRoom > 200 ? 'Install energy-saving devices' : 'Continue monitoring',
      value: totalElectricity.toFixed(0),
    };

    res.status(200).json({
      success: true, message: 'AI Predictions',
      data: { predictions: [roomPrediction, attendancePrediction, feePrediction, electricityPrediction] },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Global Search ────────────────────────────────────────────────────────
exports.globalSearch = async (req, res) => {
  try {
    const { q, type, page = 1, limit = 20 } = req.query;
    if (!q || q.length < 2) return res.status(400).json({ success: false, message: 'Query too short' });

    const regex = { $regex: q, $options: 'i' };
    const results = {};

    if (!type || type === 'students') {
      results.students = await User.find({
        role: 'STUDENT', isActive: true,
        $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { 'studentProfile.rollNumber': regex }],
      }).select('firstName lastName email studentProfile.rollNumber studentProfile.hostelId').limit(10);
    }

    if (!type || type === 'rooms') {
      results.rooms = await Room.find({
        $or: [{ roomNumber: regex }],
      }).populate('hostelId', 'name code').limit(10);
    }

    if (!type || type === 'complaints') {
      results.complaints = await Complaint.find({
        $or: [{ ticketId: regex }, { title: regex }, { description: regex }],
      }).select('ticketId title status priority category createdAt').limit(10);
    }

    if (!type || type === 'gatepasses') {
      results.gatepasses = await GatePass.find({
        $or: [{ passId: regex }],
      }).populate('studentId', 'firstName lastName').select('passId type status createdAt').limit(10);
    }

    if (!type || type === 'fees') {
      results.fees = await FeeTransaction.find({
        $or: [{ invoiceId: regex }],
      }).populate('studentId', 'firstName lastName').select('invoiceId totalAmount status dueDate').limit(10);
    }

    if (!type || type === 'leaves') {
      results.leaves = await LeaveRequest.find({
        $or: [{ leaveId: regex }, { reason: regex }],
      }).populate('studentId', 'firstName lastName').select('leaveId type status fromDate toDate').limit(10);
    }

    res.status(200).json({ success: true, message: 'Search results', data: results });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Activity Timeline ────────────────────────────────────────────────────
exports.getActivityTimeline = async (req, res) => {
  try {
    const { page = 1, limit = 30, action, userId } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.userId = userId;

    const { skip } = require('../utils/helpers').paginateQuery(Number(page), Number(limit));
    const [activities, total] = await Promise.all([
      ActivityLog.find(filter).populate('userId', 'firstName lastName role avatar').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true, message: 'Activity timeline', data: { activities },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Export Data (CSV) ────────────────────────────────────────────────────
exports.exportData = async (req, res) => {
  try {
    const { type } = req.params;
    let data, headers, rows;

    switch (type) {
      case 'students':
        data = await User.find({ role: 'STUDENT', isActive: true }).lean();
        headers = ['Name', 'Email', 'Roll Number', 'Course', 'Year', 'Department', 'Phone'];
        rows = data.map(s => [
          `${s.firstName} ${s.lastName}`, s.email, s.studentProfile?.rollNumber || '',
          s.studentProfile?.course || '', s.studentProfile?.year || '', s.studentProfile?.department || '', s.phone,
        ]);
        break;
      case 'attendance':
        data = await Attendance.find().populate('studentId', 'firstName lastName studentProfile.rollNumber').sort({ date: -1 }).limit(1000).lean();
        headers = ['Date', 'Student', 'Roll Number', 'Status', 'Method'];
        rows = data.map(a => [
          new Date(a.date).toLocaleDateString(), `${a.studentId?.firstName} ${a.studentId?.lastName}`,
          a.studentId?.studentProfile?.rollNumber || '', a.status || (a.isPresent ? 'PRESENT' : 'ABSENT'), a.method || '',
        ]);
        break;
      case 'complaints':
        data = await Complaint.find().populate('studentId', 'firstName lastName').sort({ createdAt: -1 }).limit(1000).lean();
        headers = ['Ticket ID', 'Title', 'Category', 'Priority', 'Status', 'Student', 'Date'];
        rows = data.map(c => [
          c.ticketId, c.title, c.category, c.priority, c.status,
          `${c.studentId?.firstName} ${c.studentId?.lastName}`, new Date(c.createdAt).toLocaleDateString(),
        ]);
        break;
      case 'fees':
        data = await FeeTransaction.find().populate('studentId', 'firstName lastName').sort({ createdAt: -1 }).limit(1000).lean();
        headers = ['Invoice ID', 'Student', 'Total', 'Paid', 'Status', 'Due Date'];
        rows = data.map(f => [
          f.invoiceId, `${f.studentId?.firstName} ${f.studentId?.lastName}`,
          f.totalAmount, f.paidAmount, f.status, new Date(f.dueDate).toLocaleDateString(),
        ]);
        break;
      case 'rooms':
        data = await Room.find().populate('hostelId', 'name code').populate('occupants', 'firstName lastName').lean();
        headers = ['Hostel', 'Room', 'Floor', 'Type', 'Capacity', 'Occupants', 'Status'];
        rows = data.map(r => [
          r.hostelId?.name || '', r.roomNumber, r.floor, r.type,
          r.capacity, r.occupants?.length || 0, r.status,
        ]);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid export type' });
    }

    // Generate CSV
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_export_${Date.now()}.csv`);
    res.send(csv);
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
