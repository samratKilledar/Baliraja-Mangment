const express = require('express');
const { feeReport, performanceReport } = require('./report.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(authenticate);
router.get('/fees', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), feeReport);
router.get('/performance', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), performanceReport);

module.exports = router;
