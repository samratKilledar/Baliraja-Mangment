const express = require('express');
const { superAdminDashboard } = require('./dashboard.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(authenticate);
router.get('/super-admin', authorize(ROLES.SUPER_ADMIN), superAdminDashboard);

module.exports = router;
