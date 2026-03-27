const mongoose = require('mongoose');

const checkinConfigSchema = new mongoose.Schema(
  {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    radiusMeters: { type: Number, default: 500 }, // default 500m
    checkInTime: { type: String }, // HH:mm (24h)
    checkOutTime: { type: String }, // HH:mm (24h)
    windowMinutes: { type: Number, default: 30 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CheckinConfig', checkinConfigSchema);
