const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    phone: String,
    subject: String,
    message: { type: String, required: true },
    status: { type: String, enum: ['open', 'wip', 'done'], default: 'open' },
    handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    adminNote: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Complaint', complaintSchema);
