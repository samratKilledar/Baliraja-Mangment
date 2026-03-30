const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const { createReference, listReferences } = require('./reference.controller');

const router = express.Router();

router.use(authenticate);
router.post('/', authorize(ROLES.TEACHER, ROLES.ADMIN, ROLES.SUPER_ADMIN), createReference);
router.get('/', authorize(ROLES.SUPER_ADMIN), listReferences);

module.exports = router;
