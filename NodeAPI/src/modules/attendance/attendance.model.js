const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    date: { type: Date, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
    subjectName: String,
    subjectKey: { type: String, default: '__daily__' },
    lectureCount: { type: Number, default: 1 },
    currentClass: String,
    division: String,
    status: { type: String, enum: ['present', 'absent', 'late', 'leave'], required: true },
    leaveStatus: { type: String, enum: ['requested', 'approved', 'rejected'], default: 'requested' },
    leaveType: { type: String, enum: ['short', 'full_day', 'multi_day'] },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: String,
    location: {
      lat: Number,
      lng: Number
    },
    checkInAt: Date,
    checkOutAt: Date,
    checkInLocation: {
      lat: Number,
      lng: Number
    },
    checkOutLocation: {
      lat: Number,
      lng: Number
    },
    checkInAddress: String,
    checkOutAddress: String,
    isOnLeave: { type: Boolean, default: false },
    leaveReason: String,
    leaveFrom: Date,
    leaveTo: Date,
    breakMinutes: Number,
    breakReason: String,
    breakStartedAt: Date
  },
  { timestamps: true }
);

attendanceSchema.index(
  { studentId: 1, date: 1, subjectKey: 1 },
  { unique: true, partialFilterExpression: { studentId: { $exists: true } } }
);

attendanceSchema.index(
  { userId: 1, date: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

module.exports = mongoose.model('Attendance', attendanceSchema);
