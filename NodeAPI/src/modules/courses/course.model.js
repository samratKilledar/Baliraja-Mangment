const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, enum: ['military', 'police', 'physical', 'competitive'], required: true },
    durationWeeks: Number,
    feeAmount: Number,
    description: String,
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
