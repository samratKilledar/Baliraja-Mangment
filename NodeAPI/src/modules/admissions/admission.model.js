const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    admittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    admissionDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admission', admissionSchema);
