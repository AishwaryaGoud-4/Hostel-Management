const mongoose = require('mongoose');

const feeTransactionSchema = new mongoose.Schema(
  {
    invoiceId: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    academicYear: { type: String, required: true },
    semester: { type: Number, required: true },
    lineItems: [
      {
        description: { type: String, required: true },
        amount: { type: Number, required: true },
        category: {
          type: String,
          enum: ['HOSTEL_FEE', 'MESS_FEE', 'UTILITY', 'DEPOSIT', 'FINE', 'OTHER'],
          required: true,
        },
      },
    ],
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueDate: { type: Date, required: true },
    status: { type: String, enum: ['PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'WAIVED'], default: 'PENDING' },
    lateFeeApplied: { type: Number, default: 0 },
    lateFeePerDay: { type: Number, default: 50 },
    payments: [
      {
        amount: { type: Number, required: true },
        method: { type: String, enum: ['ONLINE', 'CASH', 'CHEQUE', 'UPI'], required: true },
        transactionId: { type: String, required: true },
        paidAt: { type: Date, default: Date.now },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    riskScore: { type: Number, min: 0, max: 1 },
    remindersSent: { type: Number, default: 0 },
    lastReminderAt: Date,
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

feeTransactionSchema.index({ studentId: 1 });
feeTransactionSchema.index({ status: 1 });
feeTransactionSchema.index({ dueDate: 1 });

feeTransactionSchema.virtual('outstandingAmount').get(function () {
  return this.totalAmount + this.lateFeeApplied - this.paidAmount;
});

module.exports = mongoose.model('FeeTransaction', feeTransactionSchema);
