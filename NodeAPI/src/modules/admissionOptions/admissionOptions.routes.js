const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const { getAdmissionOptions, updateAdmissionOptions } = require('./admissionOptions.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), getAdmissionOptions);
router.put('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateAdmissionOptions);

module.exports = router;
