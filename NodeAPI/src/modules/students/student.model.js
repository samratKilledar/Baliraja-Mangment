const mongoose = require('mongoose');
require('../courses/batch.model'); // ensure Batch model registered

const studentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    enrollmentNo: { type: String, unique: true, required: true },
    dateOfBirth: Date,
    age: Number,
    gender: String,
    address: String,
    emergencyContact: String,
    guardianUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentCourseIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    admissionDate: { type: Date },
    admissionTakenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    admissionTakenAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByEmail: { type: String },
    status: { type: String, enum: ['active', 'inactive', 'graduated'], default: 'inactive' },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
