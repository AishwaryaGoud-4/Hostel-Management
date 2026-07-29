const mongoose = require('mongoose');

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true },
    type: { type: String, enum: ['BOYS', 'GIRLS', 'CO_ED'], required: true },
    address: { type: String, required: true },
    totalFloors: { type: Number, required: true, min: 1 },
    totalRooms: { type: Number, required: true, min: 1 },
    totalBeds: { type: Number, required: true, min: 1 },
    occupiedBeds: { type: Number, default: 0 },
    wardenId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    facilities: [String],
    contactNumber: { type: String, required: true },
    geoLocation: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      radiusMeters: { type: Number, default: 200 },
    },
    images: [String],
    isActive: { type: Boolean, default: true },
    monthlyRent: {
      economy: { type: Number, default: 5000 },
      standard: { type: Number, default: 8000 },
      premium: { type: Number, default: 12000 },
    },
  },
  { timestamps: true }
);

hostelSchema.index({ code: 1 });
hostelSchema.index({ wardenId: 1 });

module.exports = mongoose.model('Hostel', hostelSchema);
