const mongoose = require('mongoose');

const gatePassSchema = new mongoose.Schema(
  {
    passId: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    type: { type: String, enum: ['VISITOR', 'OUTING', 'LEAVE'], required: true },
    visitorDetails: {
      name: String,
      phone: String,
      relationship: String,
      idProof: String,
      purpose: String,
    },
    outingDetails: {
      purpose: String,
      destination: String,
      expectedReturn: Date,
    },
    leaveDetails: {
      reason: String,
      fromDate: Date,
      toDate: Date,
      parentApproval: { type: Boolean, default: false },
      parentApprovalAt: Date,
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'USED'],
      default: 'PENDING',
    },
    qrCode: String,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    checkInTime: Date,
    checkOutTime: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

gatePassSchema.index({ studentId: 1 });
gatePassSchema.index({ passId: 1 });
gatePassSchema.index({ status: 1 });

module.exports = mongoose.model('GatePass', gatePassSchema);
