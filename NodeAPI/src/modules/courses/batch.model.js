const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema(
  {
    batchName: { type: String, required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
    startDate: Date,
    endDate: Date,
    schedule: {
      days: [String],
      startTime: String,
      endTime: String,
      location: String
    },
    capacity: Number
  },
  { timestamps: true }
);

module.exports = mongoose.model('Batch', batchSchema);
