const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const { createPlacedStudent, updatePlacedStudent, listPlacedStudents, deletePlacedStudent } = require('./placedStudent.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listPlacedStudents);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createPlacedStudent);
router.put('/:placedStudentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updatePlacedStudent);
router.delete('/:placedStudentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deletePlacedStudent);

module.exports = router;
