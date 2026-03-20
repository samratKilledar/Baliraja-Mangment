const mongoose = require('mongoose');

const BrandingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    imageUrl: { type: String, default: null },
    videoUrl: { type: String, default: null },
    mediaType: { type: String, enum: ['image', 'video', null], default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Branding', BrandingSchema);
