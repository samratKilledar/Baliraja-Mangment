const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createNotice, listNotices, deleteNotice } = require('./notice.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) return cb(null, true);
    return cb(new Error('Only image or video files are allowed'));
  }
});

const router = express.Router();

// Public GET (no auth required) so all roles or unauth can view notices
router.get('/', listNotices);
// Auth routes
router.post('/', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), upload.any(), createNotice);
router.delete('/:noticeId', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteNotice);

module.exports = router;
