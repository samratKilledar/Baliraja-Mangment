const fs = require('fs');
const path = require('path');
const Notice = require('./notice.model');
const { ROLES } = require('../../utils/constants');

async function createNotice(req, res, next) {
  try {
    const uploaded =
      req.file ||
      (Array.isArray(req.files) && req.files[0]) ||
      (req.files?.file && req.files.file[0]) ||
      (req.files?.image && req.files.image[0]);
    const mime = uploaded?.mimetype || '';
    const isVideo = mime.startsWith('video/');
    const mediaUrl = uploaded ? `/uploads/${uploaded.filename}` : req.body.imageUrl;
    const rawAudience = req.body.audience;
    const audienceList =
      typeof rawAudience === 'string'
        ? rawAudience.split(',').map((a) => a.trim()).filter(Boolean)
        : Array.isArray(rawAudience) && rawAudience.length
        ? rawAudience
        : ['all'];

    const payload = {
      title: req.body.title,
      description: req.body.description,
      imageUrl: !isVideo ? mediaUrl : undefined,
      videoUrl: isVideo ? mediaUrl : undefined,
      mediaType: uploaded ? (isVideo ? 'video' : 'image') : null,
      audience: audienceList.length ? audienceList : ['all'],
      publishedAt: req.body.publishedAt || new Date(),
      createdBy: req.user.sub
    };

    const notice = await Notice.create(payload);
    res.status(201).json(notice);
  } catch (err) {
    next(err);
  }
}

async function listNotices(req, res, next) {
  try {
    const data = await Notice.find().sort({ publishedAt: -1 }).limit(50);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function deleteNotice(req, res, next) {
  try {
    const { noticeId } = req.params;
    const deleted = await Notice.findByIdAndDelete(noticeId);
    if (!deleted) return res.status(404).json({ message: 'Notice not found' });
    [deleted.imageUrl, deleted.videoUrl]
      .filter(Boolean)
      .forEach((url) => {
        const fullPath = url.startsWith('/uploads/') ? path.join(process.cwd(), url.slice(1)) : null;
        if (fullPath && fs.existsSync(fullPath)) fs.unlink(fullPath, () => {});
      });
    res.json({ message: 'Notice deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createNotice, listNotices, deleteNotice };
