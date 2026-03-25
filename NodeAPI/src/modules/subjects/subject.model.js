const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    currentClasses: [{ type: String, enum: ['11th Std', '12th Std'] }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

subjectSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
