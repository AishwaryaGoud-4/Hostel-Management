const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      enum: ['PRESENT', 'ABSENT', 'ON_LEAVE', 'LATE'],
      default: 'ABSENT',
    },
    checkIn: Date,
    checkOut: Date,
    method: { type: String, enum: ['QR_SCAN', 'MANUAL', 'GEOFENCE', 'BULK'], required: true },
    isPresent: { type: Boolean, default: false },
    geoLocation: { latitude: Number, longitude: Number },
    qrToken: String,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    remarks: String,
  },
  { timestamps: true }
);

// Keep isPresent in sync with status
attendanceSchema.pre('save', function (next) {
  this.isPresent = this.status === 'PRESENT' || this.status === 'LATE';
  next();
});

attendanceSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.status) {
    update.isPresent = update.status === 'PRESENT' || update.status === 'LATE';
  }
  next();
});

attendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ hostelId: 1, date: 1 });
attendanceSchema.index({ studentId: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
