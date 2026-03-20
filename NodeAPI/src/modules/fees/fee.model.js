const mongoose = require('mongoose');

const feeSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: false },
    feeStartDate: { type: Date },
    feeEndDate: { type: Date },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    dueAmount: { type: Number, required: true },
    dueDate: Date,
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'pending' },
    transactions: [
      {
        amount: Number,
        mode: { type: String, enum: ['cash', 'upi', 'card', 'bank_transfer'] },
        note: String,
        transactionRef: String,
        paidOn: { type: Date, default: Date.now },
        receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        studentPhone: String,
        studentEnrollment: String
      }
    ],
    updateHistory: [
      {
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        before: {
          totalAmount: Number,
          paidAmount: Number,
          dueAmount: Number,
          feeStartDate: Date,
          feeEndDate: Date,
          dueDate: Date
        },
        after: {
          totalAmount: Number,
          paidAmount: Number,
          dueAmount: Number,
          feeStartDate: Date,
          feeEndDate: Date,
          dueDate: Date
        },
        changedAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Fee', feeSchema);
