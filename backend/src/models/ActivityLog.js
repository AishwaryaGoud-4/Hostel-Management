const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userRole: { type: String, required: true },
    action: {
      type: String,
      enum: [
        'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_LOGIN',
        'ROOM_ALLOCATED', 'ROOM_DEALLOCATED', 'ROOM_UPDATED',
        'ATTENDANCE_MARKED', 'ATTENDANCE_BULK_MARKED',
        'COMPLAINT_CREATED', 'COMPLAINT_UPDATED', 'COMPLAINT_RESOLVED',
        'GATEPASS_CREATED', 'GATEPASS_APPROVED', 'GATEPASS_REJECTED',
        'LEAVE_REQUESTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED',
        'FEE_PAID', 'FEE_CREATED',
        'HOSTEL_CREATED', 'HOSTEL_UPDATED',
        'MAINTENANCE_ASSIGNED', 'MAINTENANCE_COMPLETED',
        'NOTIFICATION_SENT', 'EMERGENCY_SOS',
      ],
      required: true,
    },
    description: { type: String, required: true },
    targetType: { type: String, enum: ['User', 'Room', 'Hostel', 'Complaint', 'Attendance', 'GatePass', 'LeaveRequest', 'FeeTransaction', 'Notification'] },
    targetId: { type: mongoose.Schema.Types.ObjectId },
    metadata: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
  },
  { timestamps: true }
);

activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
