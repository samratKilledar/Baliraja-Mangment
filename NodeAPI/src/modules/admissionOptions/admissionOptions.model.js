const mongoose = require('mongoose');

const admissionOptionsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true
    },
    admissionTypes: {
      type: [String],
      default: []
    },
    academicStages: {
      type: [String],
      default: []
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('AdmissionOptions', admissionOptionsSchema);
