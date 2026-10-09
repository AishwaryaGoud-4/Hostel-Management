const LeaveRequest = require('../models/LeaveRequest');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { paginateQuery } = require('../utils/helpers');
const { toManagement, toUser, notifyUser, notifyRoles } = require('../utils/realtime');

const generateLeaveId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LV-${ts}-${rand}`;
};

// ── Create Leave Request (Student) ───────────────────────────────────────
exports.createLeave = async (req, res) => {
  try {
    const { type, fromDate, toDate, reason, supportingDocument } = req.body;
    const student = await User.findById(req.user.userId);
    const hostelId = student?.studentProfile?.hostelId || null;

    const leave = await LeaveRequest.create({
      leaveId: generateLeaveId(),
      studentId: req.user.userId,
      hostelId,
      type, fromDate, toDate, reason, supportingDocument,
      statusHistory: [{ status: 'PENDING', changedBy: req.user.userId, remarks: 'Leave request submitted' }],
    });

    // Activity log
    await ActivityLog.create({
      userId: req.user.userId, userRole: req.user.role, action: 'LEAVE_REQUESTED',
      description: `Leave request ${leave.leaveId} submitted`,
      targetType: 'LeaveRequest', targetId: leave._id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    const io = req.app.get('io');
    toManagement(io, 'leave:new', leave);
    toUser(io, req.user.userId, 'leave:updated', leave);
    await notifyRoles(io, ['SUPER_ADMIN', 'WARDEN'], {
      senderId: req.user.userId, type: 'GATE_PASS',
      title: 'New leave request', message: `Leave ${leave.leaveId} is waiting for approval.`,
      data: { leaveId: leave._id },
    });

    res.status(201).json({ success: true, message: 'Leave request submitted', data: { leave } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Get Leave Requests ───────────────────────────────────────────────────
exports.getLeaveRequests = async (req, res) => {
  try {
    const { status, hostelId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === 'STUDENT') filter.studentId = req.user.userId;
    if (status) filter.status = status;
    if (hostelId) filter.hostelId = hostelId;

    const { skip } = paginateQuery(Number(page), Number(limit));
    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('studentId', 'firstName lastName email studentProfile.rollNumber studentProfile.hostelId')
        .populate('approvedBy', 'firstName lastName')
        .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      LeaveRequest.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true, message: 'Leave requests retrieved', data: { leaves },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Approve Leave (Warden) ───────────────────────────────────────────────
exports.approveLeave = async (req, res) => {
  try {
    const { remarks } = req.body;
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Not found' });
    if (leave.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Already processed' });

    leave.status = 'APPROVED';
    leave.approvedBy = req.user.userId;
    leave.approvedAt = new Date();
    leave.wardenRemarks = remarks || '';
    leave.statusHistory.push({ status: 'APPROVED', changedBy: req.user.userId, remarks: remarks || 'Approved by warden' });
    await leave.save();

    await ActivityLog.create({
      userId: req.user.userId, userRole: req.user.role, action: 'LEAVE_APPROVED',
      description: `Leave ${leave.leaveId} approved`,
      targetType: 'LeaveRequest', targetId: leave._id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    const io = req.app.get('io');
    await notifyUser(io, leave.studentId, {
      senderId: req.user.userId, type: 'GATE_PASS',
      title: 'Leave approved', message: `Your leave ${leave.leaveId} has been approved.`,
      data: { leaveId: leave._id },
    });
    toUser(io, leave.studentId, 'leave:updated', leave);
    toManagement(io, 'leave:updated', leave);

    res.status(200).json({ success: true, message: 'Leave approved', data: { leave } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Reject Leave (Warden) ────────────────────────────────────────────────
exports.rejectLeave = async (req, res) => {
  try {
    const { reason, remarks } = req.body;
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Not found' });

    leave.status = 'REJECTED';
    leave.rejectionReason = reason || '';
    leave.wardenRemarks = remarks || '';
    leave.statusHistory.push({ status: 'REJECTED', changedBy: req.user.userId, remarks: reason || 'Rejected' });
    await leave.save();

    await ActivityLog.create({
      userId: req.user.userId, userRole: req.user.role, action: 'LEAVE_REJECTED',
      description: `Leave ${leave.leaveId} rejected`,
      targetType: 'LeaveRequest', targetId: leave._id,
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    const io = req.app.get('io');
    await notifyUser(io, leave.studentId, {
      senderId: req.user.userId, type: 'GATE_PASS',
      title: 'Leave rejected', message: `Your leave ${leave.leaveId} was rejected${reason ? `: ${reason}` : '.'}`,
      data: { leaveId: leave._id },
    });
    toUser(io, leave.studentId, 'leave:updated', leave);
    toManagement(io, 'leave:updated', leave);

    res.status(200).json({ success: true, message: 'Leave rejected', data: { leave } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Cancel Leave (Student) ───────────────────────────────────────────────
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Not found' });
    if (leave.studentId.toString() !== req.user.userId) return res.status(403).json({ success: false, message: 'Not authorized' });
    if (leave.status !== 'PENDING') return res.status(400).json({ success: false, message: 'Can only cancel pending requests' });

    leave.status = 'CANCELLED';
    leave.statusHistory.push({ status: 'CANCELLED', changedBy: req.user.userId, remarks: 'Cancelled by student' });
    await leave.save();
    toManagement(req.app.get('io'), 'leave:updated', leave);

    res.status(200).json({ success: true, message: 'Leave cancelled', data: { leave } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
