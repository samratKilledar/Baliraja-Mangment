const mongoose = require('mongoose');

const placedStudentSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    enrollmentNo: { type: String, trim: true },
    placedDate: { type: Date, required: true },
    name: { type: String, required: true, trim: true },
    age: { type: Number },
    mobileNo: { type: String, trim: true },
    address: { type: String, trim: true },
    batch: { type: String, trim: true },
    placementType: { type: String, trim: true },
    note: { type: String, trim: true },
    opinion: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByRole: { type: String, enum: ['super_admin', 'admin', 'teacher', 'student', 'parent'] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlacedStudent', placedStudentSchema);
