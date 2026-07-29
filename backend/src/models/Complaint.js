const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    ticketId: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hostel', required: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    category: {
      type: String,
      enum: ['ELECTRICAL', 'PLUMBING', 'FURNITURE', 'INTERNET', 'CLEANING', 'SECURITY', 'NOISE', 'OTHER'],
      required: true,
    },
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    images: [String],
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'], default: 'OPEN' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    aiClassification: {
      suggestedCategory: String,
      confidenceScore: { type: Number, min: 0, max: 1 },
      isEmergency: { type: Boolean, default: false },
      keywords: [String],
      processedAt: Date,
    },
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        note: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    resolution: {
      description: String,
      resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      resolvedAt: Date,
      rating: { type: Number, min: 1, max: 5 },
      feedback: String,
    },
    escalatedAt: Date,
    expectedResolutionDate: Date,
  },
  { timestamps: true }
);

complaintSchema.index({ studentId: 1 });
complaintSchema.index({ hostelId: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ ticketId: 1 });
complaintSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
