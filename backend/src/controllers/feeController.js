const FeeTransaction = require('../models/FeeTransaction');
const { generateInvoiceId, calculateLateFee, paginateQuery } = require('../utils/helpers');

exports.createInvoice = async (req, res) => {
  try {
    const { studentId, hostelId, academicYear, semester, lineItems, dueDate, lateFeePerDay } = req.body;
    const totalAmount = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const invoice = await FeeTransaction.create({
      invoiceId: generateInvoiceId(), studentId, hostelId, academicYear, semester,
      lineItems, totalAmount, dueDate: new Date(dueDate), lateFeePerDay: lateFeePerDay || 50,
    });
    res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.makePayment = async (req, res) => {
  try {
    const { amount, method, transactionId } = req.body;
    const invoice = await FeeTransaction.findById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    // Update late fee
    const lateFee = calculateLateFee(invoice.dueDate, invoice.lateFeePerDay);
    invoice.lateFeeApplied = lateFee;

    invoice.payments.push({ amount, method, transactionId, paidAt: new Date(), receivedBy: req.user?.userId });
    invoice.paidAmount += amount;

    const outstanding = invoice.totalAmount + invoice.lateFeeApplied - invoice.paidAmount;
    if (outstanding <= 0) invoice.status = 'PAID';
    else if (invoice.paidAmount > 0) invoice.status = 'PARTIAL';

    await invoice.save();
    res.status(200).json({ success: true, message: 'Payment recorded', data: { invoice } });
  } catch (e) { res.status(500).json({ success: false, message: 'Failed', error: e.message }); }
};

exports.getStudentFees = async (req, res) => {
  try {
    const studentId = req.params.studentId || req.user.userId;
    const { status, page = 1, limit = 20 } = req.query;
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
