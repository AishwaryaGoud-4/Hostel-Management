const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomNumber: { type: String, required: true },
    floor: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['SINGLE', 'DOUBLE', 'TRIPLE', 'DORMITORY'], required: true },
    status: { type: String, enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'RESERVED'], default: 'AVAILABLE' },
    capacity: { type: Number, required: true, min: 1 },
    occupants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    amenities: [String],
    monthlyRent: { type: Number, required: true },
    isAirConditioned: { type: Boolean, default: false },
    hasAttachedBathroom: { type: Boolean, default: false },
    lastMaintenanceDate: Date,
    utilityUsage: {
      electricity: { type: Number, default: 0 },
      water: { type: Number, default: 0 },
    },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

roomSchema.index({ hostelId: 1, roomNumber: 1 }, { unique: true });
roomSchema.index({ status: 1 });

roomSchema.virtual('availableBeds').get(function () {
  return this.capacity - this.occupants.length;
});

module.exports = mongoose.model('Room', roomSchema);
