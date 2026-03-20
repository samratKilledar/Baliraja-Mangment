const express = require('express');
const { createCourse, listCourses, listBatches } = require('./course.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT), listCourses);
router.get('/batches', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT), listBatches);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createCourse);

module.exports = router;
