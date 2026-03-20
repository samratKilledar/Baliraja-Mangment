const express = require('express');
const {
  listTeachers,
  updateTeacher,
  addPayment,
  extendContract,
  addLectureLog,
  listLectureLogs,
  teacherAttendance,
  publicTeacherByPhone,
  listRecentLectures,
  publicAddLectureLog,
  publicLectureLogs
} = require('./teacher.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.get('/public/by-phone/:phone', publicTeacherByPhone);
router.post('/public/:teacherId/lectures', publicAddLectureLog);
router.get('/public/:teacherId/lectures', publicLectureLogs);
router.use(authenticate);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), listTeachers);
router.get('/lectures/recent', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listRecentLectures);
router.get('/:teacherId/attendance', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), teacherAttendance);
router.get('/:teacherId/lectures', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), listLectureLogs);
router.post('/:teacherId/lectures', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), addLectureLog);
router.post('/:teacherId/extend-contract', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), extendContract);
router.put('/:teacherId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateTeacher);
router.post('/:teacherId/payments', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), addPayment);

module.exports = router;
