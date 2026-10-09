const FeeTransaction = require('../models/FeeTransaction');
const User = require('../models/User');
const Hostel = require('../models/Hostel');
const { generateInvoiceId, calculateLateFee, paginateQuery } = require('../utils/helpers');
const { toUser, toRoles, notifyUser, notifyRoles } = require('../utils/realtime');

const broadcastInvoice = (io, invoice) => {
  toUser(io, invoice.studentId, 'fee:updated', invoice);
  toRoles(io, ['SUPER_ADMIN', 'WARDEN'], 'fee:updated', invoice);
};

const isOtherStudent = (req, studentId) =>
  req.user.role === 'STUDENT' && studentId && String(studentId) !== String(req.user.userId);

// ── Helper: get current academic year string ─────────────────────────────
const getAcademicYear = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Academic year runs June-May
  return month >= 5 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
};

// ── Helper: get semester from month ──────────────────────────────────────
const getSemester = () => {
  const month = new Date().getMonth();
  // Jun-Nov = Odd semester (1), Dec-May = Even semester (2)
  return month >= 5 && month <= 10 ? 1 : 2;
};

// ── Helper: auto-generate monthly fee invoice for a student ─────────────
const autoGenerateMonthlyFee = async (studentId) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0); // last day of month

  const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const academicYear = getAcademicYear();
  const semester = getSemester();

  // Check if invoice already exists for this student+month
  const existing = await FeeTransaction.findOne({
    studentId,
    createdAt: { $gte: monthStart, $lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59) },
  });

  if (existing) return existing; // Already generated for this month

  // Get student's hostel for hostelId
  const student = await User.findById(studentId);
  let hostelId = student?.studentProfile?.hostelId;

  // If no hostel assigned, find a default one
  if (!hostelId) {
    const defaultHostel = await Hostel.findOne({ isActive: true });
    hostelId = defaultHostel?._id;
  }

  if (!hostelId) return null; // Can't generate without a hostel

  const invoice = await FeeTransaction.create({
    invoiceId: generateInvoiceId(),
    studentId,
    hostelId,
    academicYear,
    semester,
    lineItems: [
      { description: `Hostel Fee — ${monthLabel}`, amount: 7500, category: 'HOSTEL_FEE' },
    ],
    totalAmount: 7500,
    dueDate: monthEnd,
    lateFeePerDay: 50,
    status: 'PENDING',
  });

  return invoice;
};

exports.createInvoice = async (req, res) => {
  try {
    const { studentId, hostelId, academicYear, semester, lineItems, dueDate, lateFeePerDay } = req.body;
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const invoice = await FeeTransaction.create({
      invoiceId: generateInvoiceId(), studentId, hostelId, academicYear, semester,
      lineItems, totalAmount, dueDate: new Date(dueDate), lateFeePerDay: lateFeePerDay || 50,
    });
    const io = req.app.get('io');
    broadcastInvoice(io, invoice);
    await notifyUser(io, studentId, {
      senderId: req.user.userId, type: 'FEE',
      title: 'New fee invoice', message: `Invoice ${invoice.invoiceId} for ₹${totalAmount.toLocaleString('en-IN')} is due ${new Date(dueDate).toLocaleDateString('en-IN')}.`,
      data: { invoiceId: invoice._id },
    });
    res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.makePayment = async (req, res) => {
  try {
    const { method, transactionId } = req.body;
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid payment amount' });
    }
    const invoice = await FeeTransaction.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    if (isOtherStudent(req, invoice.studentId)) {
      return res.status(403).json({ success: false, message: 'You can only pay your own invoices' });
    }
    if (invoice.status === 'PAID') {
      return res.status(400).json({ success: false, message: 'This invoice is already paid' });
    }

    // Update late fee
    const lateFee = calculateLateFee(invoice.dueDate, invoice.lateFeePerDay);
    invoice.lateFeeApplied = lateFee;

    invoice.payments.push({ amount, method, transactionId, paidAt: new Date(), receivedBy: req.user?.userId });
    invoice.paidAmount += amount;

    const outstanding = invoice.totalAmount + invoice.lateFeeApplied - invoice.paidAmount;
    if (outstanding <= 0) invoice.status = 'PAID';
    else if (invoice.paidAmount > 0) invoice.status = 'PARTIAL';

    await invoice.save();

    const io = req.app.get('io');
    broadcastInvoice(io, invoice);
    const paid = `₹${amount.toLocaleString('en-IN')}`;
    await notifyUser(io, invoice.studentId, {
      senderId: req.user.userId, type: 'FEE',
      title: invoice.status === 'PAID' ? 'Fee paid in full' : 'Payment received',
      message: `${paid} received for invoice ${invoice.invoiceId}.`,
      data: { invoiceId: invoice._id },
    });
    await notifyRoles(io, ['SUPER_ADMIN'], {
      senderId: req.user.userId, type: 'FEE',
      title: 'Fee payment received', message: `${paid} paid on invoice ${invoice.invoiceId}.`,
      data: { invoiceId: invoice._id },
    }, { exclude: req.user.userId });

    res.status(200).json({ success: true, message: 'Payment recorded', data: { invoice } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getStudentFees = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.userId;
    if (isOtherStudent(req, studentId)) {
      return res.status(403).json({ success: false, message: 'You can only view your own fees' });
    }
    const { status, page = 1, limit = 20 } = req.query;

    // Auto-generate this month's invoice if it doesn't exist yet
    await autoGenerateMonthlyFee(studentId);

    const filter = { studentId };
    if (status) filter.status = status;

    const { skip } = paginateQuery(Number(page), Number(limit));
    const [invoices, total] = await Promise.all([
      FeeTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      FeeTransaction.countDocuments(filter),
    ]);

    // Auto-update overdue
    const now = new Date();
    for (const inv of invoices) {
      if (inv.dueDate < now && ['PENDING', 'PARTIAL'].includes(inv.status)) {
        inv.status = 'OVERDUE';
        inv.lateFeeApplied = calculateLateFee(inv.dueDate, inv.lateFeePerDay);
        await inv.save();
      }
    }

    const totalDue = invoices.reduce((sum, inv) => sum + Math.max(0, inv.totalAmount + inv.lateFeeApplied - inv.paidAmount), 0);

    res.status(200).json({
      success: true, message: 'Fees retrieved',
      data: { invoices, totalDue },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

// ── Explicitly generate monthly fee (can be called by student or admin) ──
exports.generateMonthlyFee = async (req, res) => {
  try {
    const studentId = req.body.studentId || req.user.userId;
    if (isOtherStudent(req, studentId)) {
      return res.status(403).json({ success: false, message: 'You can only generate your own invoice' });
    }
    const invoice = await autoGenerateMonthlyFee(studentId);
    if (!invoice) {
      return res.status(400).json({ success: false, message: 'Could not generate invoice. No hostel assigned.' });
    }
    res.status(200).json({ success: true, message: 'Monthly fee invoice ready', data: { invoice } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getFeeStats = async (req, res) => {
  try {
    const stats = await FeeTransaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' } } },
    ]);
    const totalRevenue = await FeeTransaction.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' }, collected: { $sum: '$paidAmount' }, lateFees: { $sum: '$lateFeeApplied' } } },
    ]);
    res.status(200).json({ success: true, message: 'Fee stats', data: { byStatus: stats, revenue: totalRevenue[0] || {} } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getAllInvoices = async (req, res) => {
  try {
    const { status, hostelId, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (hostelId) filter.hostelId = hostelId;
    const { skip } = paginateQuery(Number(page), Number(limit));
    const [invoices, total] = await Promise.all([
      FeeTransaction.find(filter).populate('studentId', 'firstName lastName email studentProfile.rollNumber').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      FeeTransaction.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true, message: 'Invoices', data: { invoices },
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};
