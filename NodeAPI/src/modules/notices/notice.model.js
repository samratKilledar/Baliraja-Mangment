const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    imageUrl: String,
    videoUrl: String,
    mediaType: { type: String, enum: ['image', 'video', null], default: null },
    audience: { type: [String], default: ['all'] }, // roles or 'all'
    publishedAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notice', noticeSchema);
