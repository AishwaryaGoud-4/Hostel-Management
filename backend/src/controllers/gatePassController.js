const QRCode = require('qrcode');
const GatePass = require('../models/GatePass');
const User = require('../models/User');
const { generatePassId, paginateQuery } = require('../utils/helpers');
const { toManagement, toUser, notifyUser, notifyRoles } = require('../utils/realtime');

const broadcastPass = (io, pass, extraEvent) => {
  toUser(io, pass.studentId, 'gatepass:updated', pass);
  if (extraEvent) toUser(io, pass.studentId, extraEvent, pass);
  toManagement(io, 'gatepass:updated', pass);
};

exports.createGatePass = async (req, res) => {
  try {
    const { type, visitorDetails, outingDetails, leaveDetails, expiresAt } = req.body;
    const student = await User.findById(req.user.userId).select('studentProfile.hostelId');
    const hostelId = student?.studentProfile?.hostelId;
    if (!hostelId) {
      return res.status(400).json({ success: false, message: 'You need to be assigned to a hostel before requesting a gate pass.' });
    }
    const passId = generatePassId();
    const qrCode = await QRCode.toDataURL(JSON.stringify({ passId, studentId: req.user.userId, type, createdAt: Date.now() }));

    const pass = await GatePass.create({
      passId, studentId: req.user.userId, hostelId, type,
      visitorDetails, outingDetails, leaveDetails, qrCode,
      expiresAt: new Date(expiresAt || Date.now() + 24 * 60 * 60 * 1000),
    });

    const io = req.app.get('io');
    toManagement(io, 'gatepass:new', pass);
    toUser(io, req.user.userId, 'gatepass:updated', pass);
    await notifyRoles(io, ['SUPER_ADMIN', 'WARDEN', 'STAFF'], {
      senderId: req.user.userId, type: 'GATE_PASS',
      title: `New ${type.toLowerCase()} gate pass request`,
      message: `Pass ${passId} is waiting for approval.`,
      data: { passId: pass._id },
    });

    res.status(201).json({ success: true, message: 'Gate pass created', data: { pass } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.approveGatePass = async (req, res) => {
  try {
    const pass = await GatePass.findById(req.params.id);
    if (!pass) return res.status(404).json({ success: false, message: 'Not found' });

    pass.status = 'APPROVED';
    pass.approvedBy = req.user.userId;
    pass.approvedAt = new Date();
    await pass.save();

    const io = req.app.get('io');
    await notifyUser(io, pass.studentId, {
      senderId: req.user.userId, type: 'GATE_PASS',
      title: 'Gate pass approved', message: `Your ${pass.type.toLowerCase()} pass ${pass.passId} has been approved.`,
      data: { passId: pass._id },
    });
    broadcastPass(io, pass, 'gatepass:approved');

    res.status(200).json({ success: true, message: 'Approved', data: { pass } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.rejectGatePass = async (req, res) => {
  try {
    const { reason } = req.body;
    const pass = await GatePass.findById(req.params.id);
    if (!pass) return res.status(404).json({ success: false, message: 'Not found' });

    pass.status = 'REJECTED';
    pass.rejectionReason = reason;
    await pass.save();

    const io = req.app.get('io');
    await notifyUser(io, pass.studentId, {
      senderId: req.user.userId, type: 'GATE_PASS',
      title: 'Gate pass rejected', message: `Your pass ${pass.passId} was rejected${reason ? `: ${reason}` : '.'}`,
      data: { passId: pass._id },
    });
    broadcastPass(io, pass, 'gatepass:rejected');

    res.status(200).json({ success: true, message: 'Rejected', data: { pass } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getGatePasses = async (req, res) => {
  try {
    const { status, type, hostelId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (req.user.role === 'STUDENT') filter.studentId = req.user.userId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (hostelId) filter.hostelId = hostelId;

    const { skip } = paginateQuery(Number(page), Number(limit));
    const [passes, total] = await Promise.all([
      GatePass.find(filter).populate('studentId', 'firstName lastName studentProfile.rollNumber').populate('approvedBy', 'firstName lastName').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      GatePass.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, message: 'Gate passes', data: { passes },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.verifyGatePass = async (req, res) => {
  try {
    const { passId } = req.body;
    const pass = await GatePass.findOne({ passId }).populate('studentId', 'firstName lastName studentProfile');
    if (!pass) return res.status(404).json({ success: false, message: 'Invalid pass' });
    if (pass.status !== 'APPROVED') return res.status(400).json({ success: false, message: `Pass is ${pass.status}` });
    if (pass.expiresAt < new Date()) {
      pass.status = 'EXPIRED'; await pass.save();
      return res.status(400).json({ success: false, message: 'Pass expired' });
    }
    if (!pass.checkOutTime) { pass.checkOutTime = new Date(); }
    else { pass.checkInTime = new Date(); pass.status = 'USED'; }
    await pass.save();

    const io = req.app.get('io');
    toUser(io, pass.studentId._id, 'gatepass:updated', pass);
    toManagement(io, 'gatepass:updated', pass);

    res.status(200).json({ success: true, message: 'Pass verified', data: { pass } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
