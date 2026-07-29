const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['SUPER_ADMIN', 'WARDEN', 'STUDENT', 'STAFF'],
      required: true,
      default: 'STUDENT',
    },
    phone: { type: String, required: true },
    avatar: String,
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
    studentProfile: {
      rollNumber: { type: String, sparse: true },
      course: String,
      year: { type: Number, min: 1, max: 6 },
      department: String,
      hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' },
      roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room' },
      guardianName: String,
      guardianPhone: String,
      address: String,
      dateOfBirth: Date,
      bloodGroup: String,
      sleepPreference: { type: String, enum: ['EARLY_BIRD', 'NIGHT_OWL', 'FLEXIBLE'], default: 'FLEXIBLE' },
      budgetPreference: { type: String, enum: ['ECONOMY', 'STANDARD', 'PREMIUM'], default: 'STANDARD' },
      admissionDate: Date,
    },
    staffProfile: {
      employeeId: String,
      department: String,
      specialization: String,
      assignedHostels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Hostel' }],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.refreshToken;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpiry;
        return ret;
      },
    },
  }
);

userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'studentProfile.rollNumber': 1 });

module.exports = mongoose.model('User', userSchema);
