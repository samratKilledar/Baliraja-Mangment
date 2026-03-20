const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    specialization: [String],
    experienceYears: Number,
    assignedBatchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Batch' }],
    contractStart: Date,
    contractEnd: Date,
    contractExtensions: [
      {
        from: Date,
        to: Date,
        note: String,
        extendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        extendedAt: { type: Date, default: Date.now }
      }
    ],
    totalContractAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    monthlySalary: { type: Number, default: 0 },
    salaryPaidAmount: { type: Number, default: 0 },
    payments: [
      {
        amount: Number,
        paidOn: { type: Date, default: Date.now },
        note: String,
        paymentType: { type: String, enum: ['contract', 'salary'], default: 'contract' },
        monthOf: Date,
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ],
    lectureLogs: [
      {
        date: { type: Date, default: Date.now },
        count: { type: Number, default: 1 },
        subject: String,
        studentCount: Number,
        // optional time range for that lecture day
        startTime: Date,
        endTime: Date,
        hours: Number,
        note: String,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Teacher', teacherSchema);
