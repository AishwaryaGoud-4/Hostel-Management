const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const ActivityLog = require('../models/ActivityLog');
const { generateTicketId, paginateQuery } = require('../utils/helpers');
const config = require('../config');

// ── Rule-based AI Complaint Classification (fallback) ────────────────────
const PRIORITY_RULES = [
  { keywords: ['fire', 'smoke', 'gas leak', 'electrical fire', 'short circuit', 'sparks', 'burning'], priority: 'CRITICAL', category: 'ELECTRICAL', estimatedHours: 1 },
  { keywords: ['electricity', 'power', 'no light', 'fan not working', 'switch', 'socket', 'wiring', 'voltage'], priority: 'CRITICAL', category: 'ELECTRICAL', estimatedHours: 4 },
  { keywords: ['water leak', 'pipe burst', 'flooding', 'water damage', 'sewage', 'drainage', 'overflow'], priority: 'HIGH', category: 'PLUMBING', estimatedHours: 6 },
  { keywords: ['no water', 'tap', 'geyser', 'shower', 'bathroom', 'toilet', 'basin', 'plumbing'], priority: 'HIGH', category: 'PLUMBING', estimatedHours: 8 },
  { keywords: ['wifi', 'internet', 'network', 'connection', 'router', 'lan', 'ethernet'], priority: 'MEDIUM', category: 'INTERNET', estimatedHours: 12 },
  { keywords: ['bed', 'chair', 'table', 'desk', 'cupboard', 'door', 'window', 'lock', 'broken', 'furniture', 'wardrobe'], priority: 'MEDIUM', category: 'FURNITURE', estimatedHours: 24 },
  { keywords: ['cleaning', 'dirty', 'garbage', 'waste', 'dustbin', 'sweeping', 'mopping', 'pest', 'cockroach', 'rat', 'insect'], priority: 'LOW', category: 'CLEANING', estimatedHours: 24 },
  { keywords: ['noise', 'disturbance', 'loud', 'music', 'party', 'drunk'], priority: 'MEDIUM', category: 'NOISE', estimatedHours: 2 },
  { keywords: ['security', 'theft', 'stolen', 'suspicious', 'break-in', 'unsafe', 'cctv'], priority: 'HIGH', category: 'SECURITY', estimatedHours: 2 },
];

function classifyComplaint(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  let bestMatch = { priority: 'MEDIUM', category: null, confidence: 0.3, isEmergency: false, keywords: [], estimatedHours: 48 };

  for (const rule of PRIORITY_RULES) {
    const matched = rule.keywords.filter(kw => text.includes(kw));
    if (matched.length > 0) {
      const confidence = Math.min(0.95, 0.5 + matched.length * 0.15);
      if (confidence > bestMatch.confidence) {
        bestMatch = {
          priority: rule.priority,
          category: rule.category,
          confidence,
          isEmergency: rule.priority === 'CRITICAL',
          keywords: matched,
          estimatedHours: rule.estimatedHours,
        };
      }
    }
  }
  return bestMatch;
}

exports.createComplaint = async (req, res) => {
  try {
    const { title, description, category, hostelId, roomId, images } = req.body;
    const ticketId = generateTicketId();

    // Run local AI classification first
    const aiResult = classifyComplaint(title, description);

    const complaint = await Complaint.create({
      ticketId, studentId: req.user.userId, hostelId, roomId,
      category: category || aiResult.category || 'OTHER',
      priority: aiResult.priority,
      title, description, images: images || [],
      expectedResolutionDate: new Date(Date.now() + aiResult.estimatedHours * 3600000),
      aiClassification: {
        suggestedCategory: aiResult.category,
        confidenceScore: aiResult.confidence,
        isEmergency: aiResult.isEmergency,
        keywords: aiResult.keywords,
        processedAt: new Date(),
      },
      statusHistory: [{ status: 'OPEN', changedBy: req.user.userId, note: 'Ticket created', timestamp: new Date() }],
    });

    // If AI detected emergency, auto-escalate
    if (aiResult.isEmergency) {
      complaint.status = 'ESCALATED';
      complaint.escalatedAt = new Date();
      complaint.statusHistory.push({ status: 'ESCALATED', changedBy: req.user.userId, note: 'AI auto-escalated: emergency detected', timestamp: new Date() });
      await complaint.save();
    }

    // Try remote AI service for more accurate results (non-blocking)
    try {
      const resp = await fetch(`${config.aiServiceUrl}/ai/triage-complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (resp.ok) {
        const remoteResult = await resp.json();
        complaint.aiClassification = {
          suggestedCategory: remoteResult.category,
          confidenceScore: remoteResult.confidence,
          isEmergency: remoteResult.is_emergency,
          keywords: remoteResult.keywords || [],
          processedAt: new Date(),
        };
        if (remoteResult.is_emergency && complaint.status !== 'ESCALATED') {
          complaint.priority = 'CRITICAL';
          complaint.status = 'ESCALATED';
          complaint.escalatedAt = new Date();
        }
        await complaint.save();
      }
    } catch (_) { /* Remote AI unavailable, local classification already applied */ }

    // Activity log
    await ActivityLog.create({
      userId: req.user.userId, userRole: req.user.role, action: 'COMPLAINT_CREATED',
      description: `Complaint ${ticketId} created: ${title} [AI Priority: ${aiResult.priority}]`,
      targetType: 'Complaint', targetId: complaint._id,
      metadata: { aiPriority: aiResult.priority, aiConfidence: aiResult.confidence, aiCategory: aiResult.category },
      ipAddress: req.ip, userAgent: req.headers['user-agent'],
    });

    // Emit socket event
    if (req.app.get('io')) {
      req.app.get('io').to(`hostel_${hostelId}`).emit('complaint:new', complaint);
    }

    res.status(201).json({ success: true, message: 'Complaint created', data: { complaint } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getComplaints = async (req, res) => {
  try {
    const { status, priority, category, hostelId, page = 1, limit = 20 } = req.query;
    const filter = {};

    // Students only see their own complaints
    if (req.user.role === 'STUDENT') filter.studentId = req.user.userId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (hostelId) filter.hostelId = hostelId;

    const { skip } = paginateQuery(Number(page), Number(limit));
    const [complaints, total] = await Promise.all([
      Complaint.find(filter)
        .populate('studentId', 'firstName lastName email studentProfile.rollNumber')
        .populate('assignedTo', 'firstName lastName')
        .skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
      Complaint.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, message: 'Complaints retrieved', data: { complaints },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('studentId', 'firstName lastName email phone studentProfile')
      .populate('assignedTo', 'firstName lastName email')
      .populate('statusHistory.changedBy', 'firstName lastName');
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    res.status(200).json({ success: true, message: 'Complaint retrieved', data: { complaint } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.updateComplaintStatus = async (req, res) => {
  try {
    const { status, note, assignedTo } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;
    complaint.statusHistory.push({ status, changedBy: req.user.userId, note: note || '', timestamp: new Date() });

    if (status === 'ESCALATED') complaint.escalatedAt = new Date();
    await complaint.save();

    // Notify student
    await Notification.create({
      recipientId: complaint.studentId, senderId: req.user.userId, type: 'COMPLAINT',
      title: `Complaint ${complaint.ticketId} Updated`, message: `Status changed to ${status}. ${note || ''}`,
      data: { complaintId: complaint._id, ticketId: complaint.ticketId }, link: `/complaints/${complaint._id}`,
    });

    if (req.app.get('io')) {
      req.app.get('io').to(`user_${complaint.studentId}`).emit('complaint:status_change', { complaint, status, note });
    }

    res.status(200).json({ success: true, message: 'Status updated', data: { complaint } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.resolveComplaint = async (req, res) => {
  try {
    const { description } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });

    complaint.status = 'RESOLVED';
    complaint.resolution = { description, resolvedBy: req.user.userId, resolvedAt: new Date() };
    complaint.statusHistory.push({ status: 'RESOLVED', changedBy: req.user.userId, note: description, timestamp: new Date() });
    await complaint.save();

    res.status(200).json({ success: true, message: 'Resolved', data: { complaint } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.rateComplaint = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ success: false, message: 'Not found' });
    if (complaint.studentId.toString() !== req.user.userId) return res.status(403).json({ success: false, message: 'Unauthorized' });

    complaint.resolution = { ...complaint.resolution, rating, feedback };
    complaint.status = 'CLOSED';
    complaint.statusHistory.push({ status: 'CLOSED', changedBy: req.user.userId, note: `Rated ${rating}/5`, timestamp: new Date() });
    await complaint.save();

    res.status(200).json({ success: true, message: 'Rated', data: { complaint } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getComplaintStats = async (req, res) => {
  try {
    const stats = await Complaint.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byCategory = await Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const byPriority = await Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);
    const avgResolutionTime = await Complaint.aggregate([
      { $match: { status: 'RESOLVED' } },
      { $project: { resTime: { $subtract: ['$resolution.resolvedAt', '$createdAt'] } } },
      { $group: { _id: null, avgMs: { $avg: '$resTime' } } },
    ]);
    res.status(200).json({
      success: true, message: 'Stats',
      data: { byStatus: stats, byCategory, byPriority, avgResolutionHours: avgResolutionTime[0] ? (avgResolutionTime[0].avgMs / 3600000).toFixed(1) : 0 },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
