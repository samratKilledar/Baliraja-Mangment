const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const { listSubjects, createSubject } = require('./subject.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), listSubjects);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createSubject);

module.exports = router;
