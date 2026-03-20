const express = require('express');
const { createPerformance, getPerformanceByStudent } = require('./performance.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(authenticate);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), createPerformance);
router.get('/student/:studentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT), getPerformanceByStudent);

module.exports = router;
