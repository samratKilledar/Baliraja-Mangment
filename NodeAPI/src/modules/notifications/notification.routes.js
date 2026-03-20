const express = require('express');
const { createNotification, listMyNotifications } = require('./notification.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(authenticate);
router.get('/my', listMyNotifications);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), createNotification);

module.exports = router;
