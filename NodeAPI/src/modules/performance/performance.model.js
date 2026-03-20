const mongoose = require('mongoose');

const performanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    testName: { type: String, required: true },
    marks: Number,
    fitnessMetrics: {
      runTime: String,
      pushUps: Number,
      pullUps: Number,
      enduranceScore: Number
    },
    remarks: String,
    evaluatedOn: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Performance', performanceSchema);
