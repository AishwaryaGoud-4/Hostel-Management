const QRCode = require('qrcode');
const GatePass = require('../models/GatePass');
const Notification = require('../models/Notification');
const { generatePassId, paginateQuery } = require('../utils/helpers');

exports.createGatePass = async (req, res) => {
  try {
    const { type, hostelId, visitorDetails, outingDetails, leaveDetails, expiresAt } = req.body;
    const passId = generatePassId();
    const qrCode = await QRCode.toDataURL(JSON.stringify({ passId, studentId: req.user.userId, type, createdAt: Date.now() }));

    const pass = await GatePass.create({
      passId, studentId: req.user.userId, hostelId, type,
      visitorDetails, outingDetails, leaveDetails, qrCode,
      expiresAt: new Date(expiresAt || Date.now() + 24 * 60 * 60 * 1000),
    });

    // Notify warden
    if (req.app.get('io')) {
      req.app.get('io').to(`hostel_${hostelId}`).emit('gatepass:new', pass);
    }

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

    await Notification.create({
      recipientId: pass.studentId, senderId: req.user.userId, type: 'GATE_PASS',
      title: 'Gate Pass Approved', message: `Your ${pass.type} pass ${pass.passId} has been approved.`,
      data: { passId: pass._id }, link: `/gate-passes/${pass._id}`,
    });

    if (req.app.get('io')) {
      req.app.get('io').to(`user_${pass.studentId}`).emit('gatepass:approved', pass);
    }

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

    await Notification.create({
      recipientId: pass.studentId, senderId: req.user.userId, type: 'GATE_PASS',
      title: 'Gate Pass Rejected', message: `Your pass ${pass.passId} was rejected: ${reason}`,
    });

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
    // Mark as used
    if (!pass.checkOutTime) { pass.checkOutTime = new Date(); }
    else { pass.checkInTime = new Date(); pass.status = 'USED'; }
    await pass.save();
    res.status(200).json({ success: true, message: 'Pass verified', data: { pass } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
