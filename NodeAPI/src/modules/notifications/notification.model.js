const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    targetRoles: [String],
    targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    channel: { type: String, enum: ['in_app', 'email', 'sms', 'push'], default: 'in_app' },
    scheduledAt: Date,
    sentAt: Date,
    isReadBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
