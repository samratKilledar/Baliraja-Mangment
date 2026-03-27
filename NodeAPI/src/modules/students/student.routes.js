const express = require('express');
const {
  createStudent,
  listStudents,
  getStudent,
  getMyStudent,
  divisionAllocationRoster,
  assignStudentDivision,
  autoAllocateDivisions,
  updateStudent,
  deleteStudent,
  exportStudentPdf,
  publicStudentByPhone,
  reverseGeocode
} = require('./student.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

// public lookup by phone (used by mobile when no token)
router.get('/public/by-phone/:phone', publicStudentByPhone);

router.use(authenticate);
router.get('/reverse-geocode', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), reverseGeocode);
router.get('/division-allocation', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), divisionAllocationRoster);
router.post('/division-allocation/assign', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), assignStudentDivision);
router.post('/division-allocation/auto', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), autoAllocateDivisions);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), listStudents);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createStudent);
router.get('/:studentId/pdf', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), exportStudentPdf);
router.get('/me', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT), getMyStudent);
router.get('/:studentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), getStudent);
router.put('/:studentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), updateStudent);
router.delete('/:studentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteStudent);

module.exports = router;
