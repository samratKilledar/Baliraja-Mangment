const fs = require('fs');
const path = require('path');
const Branding = require('./branding.model');

const SPLASH_KEY = 'splash';

function resolveUploadPath(url) {
  if (!url) return null;
  if (url.startsWith('/uploads/')) {
    return path.join(process.cwd(), url.startsWith('/') ? url.slice(1) : url);
  }
  return null;
}

async function getSplash(req, res, next) {
  try {
    const branding = await Branding.findOne({ key: SPLASH_KEY });
    res.set('Cache-Control', 'no-store');
    res.status(200).json({
      imageUrl: branding?.imageUrl || null,
      videoUrl: branding?.videoUrl || null,
      mediaType: branding?.mediaType || null,
      updatedAt: branding?.updatedAt || null,
      updatedBy: branding?.updatedBy || null
    });
  } catch (err) {
    next(err);
  }
}

async function uploadSplash(req, res, next) {
  try {
    const uploadedFile =
      req.file ||
      (Array.isArray(req.files) && req.files[0]) ||
      (req.files?.file && req.files.file[0]) ||
      (req.files?.image && req.files.image[0]);

    if (!uploadedFile) {
      return res.status(400).json({ message: 'Splash media is required' });
    }

    const mime = uploadedFile.mimetype || '';
    if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
      return res.status(400).json({ message: 'Only image or video files are allowed' });
    }
    const isVideo = mime.startsWith('video/');
    const newUrl = `/uploads/${uploadedFile.filename}`;
    const existing = await Branding.findOne({ key: SPLASH_KEY });
    const oldUrl = isVideo ? existing?.videoUrl : existing?.imageUrl;

    const updated = await Branding.findOneAndUpdate(
      { key: SPLASH_KEY },
      isVideo
        ? { videoUrl: newUrl, imageUrl: null, mediaType: 'video', updatedBy: req.user?._id }
        : { imageUrl: newUrl, videoUrl: null, mediaType: 'image', updatedBy: req.user?._id },
      { new: true, upsert: true }
    );

    if (oldUrl && oldUrl !== newUrl) {
      const fullPath = resolveUploadPath(oldUrl);
      if (fullPath && fs.existsSync(fullPath)) {
        fs.unlink(fullPath, () => {});
      }
    }

    res.json({
      message: `Splash ${isVideo ? 'video' : 'image'} updated`,
      imageUrl: updated.imageUrl,
      videoUrl: updated.videoUrl,
      mediaType: updated.mediaType,
      updatedAt: updated.updatedAt
    });
  } catch (err) {
    next(err);
  }
}

async function deleteSplash(req, res, next) {
  try {
    const existing = await Branding.findOne({ key: SPLASH_KEY });
    if (!existing) {
      return res.status(200).json({ message: 'Already using default splash' });
    }

    const paths = [existing.imageUrl, existing.videoUrl]
      .map(resolveUploadPath)
      .filter(Boolean);
    paths.forEach((p) => {
      if (p && fs.existsSync(p)) fs.unlink(p, () => {});
    });

    await Branding.deleteOne({ key: SPLASH_KEY });
    res.json({ message: 'Splash reset to default', imageUrl: null, videoUrl: null, mediaType: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSplash, uploadSplash, deleteSplash };
