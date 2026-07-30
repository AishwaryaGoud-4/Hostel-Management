const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    leaveId: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
    type: { type: String, enum: ['PERSONAL', 'MEDICAL', 'FAMILY', 'ACADEMIC', 'OTHER'], required: true },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    supportingDocument: String,
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
      default: 'PENDING',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectionReason: String,
    wardenRemarks: String,
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        remarks: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

leaveRequestSchema.index({ studentId: 1 });
leaveRequestSchema.index({ hostelId: 1, status: 1 });
leaveRequestSchema.index({ leaveId: 1 });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
