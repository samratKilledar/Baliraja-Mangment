const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true },
    deviceUuid: { type: String, trim: true },
    platform: { type: String, enum: ['android', 'ios', 'web'], default: 'android' },
    app: { type: String, enum: ['admin', 'student', 'parent', 'teacher'], default: 'student' },
    lastSeen: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

deviceTokenSchema.index({ token: 1 }, { unique: true });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema);
