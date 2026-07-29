const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    date: { type: Date, required: true },
    checkIn: Date,
    checkOut: Date,
    method: { type: String, enum: ['QR_SCAN', 'MANUAL', 'GEOFENCE'], required: true },
    isPresent: { type: Boolean, default: false },
    geoLocation: { latitude: Number, longitude: Number },
    qrToken: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
  },
  { timestamps: true }
);

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ hostelId: 1, date: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
