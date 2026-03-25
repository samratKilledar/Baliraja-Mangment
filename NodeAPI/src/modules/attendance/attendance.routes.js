const express = require('express');
const {
  markAttendance,
  attendanceByStudent,
  checkIn,
  checkOut,
  requestLeave,
  myAttendance,
  dailyAttendanceOverview,
  teacherRoster,
  classAttendanceSummary,
  attendanceReport,
  flaggedAbsentees,
  publicCheckIn,
  publicCheckOut,
  publicAttendanceByPhone,
  listLeaves,
  updateLeaveStatus,
  deleteLeave,
  myLeaves,
  getCheckinConfig,
  setCheckinConfig
} = require('./attendance.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const jwt = require('jsonwebtoken');

const router = express.Router();

function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // ignore invalid token
  }
  return next();
}

// public fallbacks by phone (for app without JWT)
router.post('/public/check-in', publicCheckIn);
router.post('/public/check-out', publicCheckOut);
router.get('/public/by-phone/:phone', publicAttendanceByPhone);
router.get('/public/config', getCheckinConfig);

// student leave request (optional auth / phone)
router.post('/leave', optionalAuthenticate, requestLeave);
router.get('/my-leaves', optionalAuthenticate, myLeaves);

router.use(authenticate);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), markAttendance);
router.post('/check-in', authorize(ROLES.STUDENT, ROLES.ADMIN, ROLES.TEACHER), checkIn);
router.post('/check-out', authorize(ROLES.STUDENT, ROLES.ADMIN, ROLES.TEACHER), checkOut);
router.get('/leaves', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listLeaves);
router.delete('/leaves/:leaveId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteLeave);
router.put('/leave/:leaveId/status', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateLeaveStatus);
router.get('/checkin-config', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), getCheckinConfig);
router.post('/checkin-config', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), setCheckinConfig);
router.get('/daily', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), dailyAttendanceOverview);
router.get('/teacher/roster', authorize(ROLES.TEACHER), teacherRoster);
router.get('/class-summary', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), classAttendanceSummary);
router.get('/report', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), attendanceReport);
router.get('/student/:studentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT), attendanceByStudent);
router.get('/my', myAttendance);
router.get('/flagged/missing', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), flaggedAbsentees);

module.exports = router;
