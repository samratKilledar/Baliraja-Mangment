const mongoose = require('mongoose');

const referenceSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    mobileNo: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: '' },
    source: { type: String, enum: ['android', 'web'], default: 'web' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByRole: { type: String, enum: ['teacher', 'admin', 'super_admin'] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Reference', referenceSchema);
