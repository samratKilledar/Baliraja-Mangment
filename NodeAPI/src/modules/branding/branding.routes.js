const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const { getSplash, uploadSplash, deleteSplash } = require('./branding.controller');

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const router = express.Router();

router.get('/splash', getSplash);
router.post(
  '/splash',
  authenticate,
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  upload.any(), // accept any field name to avoid LIMIT_UNEXPECTED_FILE
  uploadSplash
);
router.delete('/splash', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteSplash);

module.exports = router;
