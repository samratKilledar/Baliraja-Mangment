const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const { createPlacedStudent, listPlacedStudents } = require('./placedStudent.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listPlacedStudents);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createPlacedStudent);

module.exports = router;
