const mongoose = require('mongoose');

const parentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    studentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
    relationType: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Parent', parentSchema);
