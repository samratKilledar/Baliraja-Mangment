const Attendance = require('./attendance.model');
const User = require('../users/user.model');
const Student = require('../students/student.model');
const CheckinConfig = require('./checkinConfig.model');

function normalizeDate(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}

function formatAddressFromLoc(loc) {
  if (!loc?.lat || !loc?.lng) return undefined;
  const lat = Number(loc.lat).toFixed(5);
  const lng = Number(loc.lng).toFixed(5);
  return `Lat ${lat}, Lng ${lng}`;
}

async function resolveAddress(loc) {
  try {
    if (!loc?.lat || !loc?.lng) return undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${loc.lat}&lon=${loc.lng}&zoom=16&addressdetails=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ims-attendance/1.0 (+https://baliraja.local)' },
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return undefined;
    const data = await res.json();
    return data?.display_name;
  } catch (err) {
    return undefined;
  }
}

function haversineDistanceMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

async function getActiveCheckinConfig() {
  return await CheckinConfig.findOne().sort({ updatedAt: -1 }).lean();
}

async function enforceGeofence(location) {
  const cfg = await getActiveCheckinConfig();
  if (!cfg) return { ok: true };
  if (!location?.lat || !location?.lng) {
    return { ok: false, message: 'Location required for check-in/out' };
  }
  const distance = haversineDistanceMeters(
    { lat: Number(location.lat), lng: Number(location.lng) },
    { lat: Number(cfg.lat), lng: Number(cfg.lng) }
  );
  if (distance > (cfg.radiusMeters || 500)) {
    return { ok: false, message: `Outside allowed area (${Math.round(distance)}m > ${cfg.radiusMeters || 500}m)` };
  }
  return { ok: true, cfg };
}

function withinTimeWindow(targetHHMM, windowMinutes = 30) {
  if (!targetHHMM) return true;
  const [hh, mm] = targetHHMM.split(':').map((n) => Number(n));
  if (Number.isNaN(hh) || Number.isNaN(mm)) return true;
  const now = new Date();
  const center = new Date();
  center.setHours(hh, mm, 0, 0);
  const diff = Math.abs(now.getTime() - center.getTime()) / 60000;
  return diff <= windowMinutes;
}

async function markAttendance(req, res, next) {
  try {
    const payload = { ...req.body, markedBy: req.user.sub };
    const match = payload.studentId
      ? { studentId: payload.studentId, date: payload.date }
      : { userId: payload.userId, date: payload.date };

    const record = await Attendance.findOneAndUpdate(
      match,
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

async function checkIn(req, res, next) {
  try {
    let { studentId, batchId, location } = req.body;
    if (!studentId && req.user.role === 'student') {
      const student = await require('../students/student.model').findOne({ userId: req.user.sub });
      studentId = student?._id;
      batchId = batchId || student?.batchId;
    }
    const date = normalizeDate(req.body.date);
    const now = new Date();

    if (!studentId && req.user.role === 'student') {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const leaveBlock = studentId
      ? await Attendance.findOne({ studentId, status: 'leave', leaveStatus: 'approved', leaveFrom: { $lte: date }, leaveTo: { $gte: date } })
      : null;
    if (leaveBlock) return res.status(403).json({ message: 'Leave approved for this date. Check-in disabled.' });

    const existing = await Attendance.findOne(studentId ? { studentId, date } : { userId: req.user.sub, date });
    if (existing?.checkInAt) {
      return res.status(400).json({ message: 'Already checked in today' });
    }

    const geo = await enforceGeofence(location);
    if (!geo.ok) return res.status(403).json({ message: geo.message });

    // time window for students only
    if (studentId && geo.cfg && geo.cfg.checkInTime) {
      const windowOk = withinTimeWindow(geo.cfg.checkInTime, geo.cfg.windowMinutes || 30);
      if (!windowOk) return res.status(403).json({ message: 'Check-in not allowed right now (outside allowed time window)' });
    }

    const match = studentId ? { studentId, date } : { userId: req.user.sub, date };

    const record = await Attendance.findOneAndUpdate(
      match,
      {
        studentId,
        userId: studentId ? undefined : req.user.sub,
        batchId,
        date,
        status: 'present',
        markedBy: req.user.sub,
        checkInAt: now,
        checkInLocation: location,
        checkInAddress: (await resolveAddress(location)) || formatAddressFromLoc(location),
        isOnLeave: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

async function checkOut(req, res, next) {
  try {
    let { studentId, location } = req.body;
    if (!studentId && req.user.role === 'student') {
      const student = await require('../students/student.model').findOne({ userId: req.user.sub });
      studentId = student?._id;
    }
    const date = normalizeDate(req.body.date);
    const now = new Date();

    if (!studentId && req.user.role === 'student') {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const leaveBlock = studentId
      ? await Attendance.findOne({ studentId, status: 'leave', leaveStatus: 'approved', leaveFrom: { $lte: date }, leaveTo: { $gte: date } })
      : null;
    if (leaveBlock) return res.status(403).json({ message: 'Leave approved for this date. Check-out disabled.' });

    const match = studentId ? { studentId, date } : { userId: req.user.sub, date };

    const existing = await Attendance.findOne(match);
    if (!existing?.checkInAt) return res.status(404).json({ message: 'No check-in found for today' });
    if (existing.checkOutAt) return res.status(400).json({ message: 'Already checked out today' });

    const geo = await enforceGeofence(location);
    if (!geo.ok) return res.status(403).json({ message: geo.message });

    if (studentId && geo.cfg && geo.cfg.checkOutTime) {
      const windowOk = withinTimeWindow(geo.cfg.checkOutTime, geo.cfg.windowMinutes || 30);
      if (!windowOk) return res.status(403).json({ message: 'Check-out not allowed right now (outside allowed time window)' });
    }

    existing.checkOutAt = now;
    existing.checkOutLocation = location;
    existing.checkOutAddress = (await resolveAddress(location)) || formatAddressFromLoc(location);
    existing.status = 'present';
    existing.isOnLeave = false;
    existing.markedBy = req.user.sub;
    await existing.save();

    res.json(existing);
  } catch (err) {
    next(err);
  }
}

async function requestLeave(req, res, next) {
  try {
    let { studentId, leaveFrom, leaveTo, leaveReason, breakMinutes, breakReason, leaveType, phone } = req.body;
    const phoneDigits = normalizePhone(phone);
    let teacherUserId = null;

    if (!studentId && req.user?.role === 'student') {
      const student = await require('../students/student.model').findOne({ userId: req.user.sub });
      studentId = student?._id;
    }
    if (!studentId && phoneDigits) {
      const student = await resolveStudentByPhone(phoneDigits);
      studentId = student?._id;
    }

    // teacher leave support (by auth or phone)
    if (!studentId && req.user?.role === 'teacher') {
      teacherUserId = req.user.sub;
    }
    if (!studentId && !teacherUserId && phoneDigits) {
      const teacher = await resolveTeacherByPhone(phoneDigits);
      teacherUserId = teacher?.user?._id || null;
    }

    const fromDate = normalizeDate(leaveFrom);
    const toDate = leaveTo ? normalizeDate(leaveTo) : fromDate;

    if (!studentId && !teacherUserId) return res.status(404).json({ message: 'Profile not found' });

    const record = await Attendance.create({
      studentId,
      userId: studentId ? undefined : teacherUserId || req.user?.sub,
      batchId: req.body.batchId,
      date: fromDate,
      status: 'leave',
      isOnLeave: true,
      leaveFrom: fromDate,
      leaveTo: toDate,
      leaveReason,
      breakMinutes,
      breakReason,
      leaveType,
      leaveStatus: 'requested',
      markedBy: req.user?.sub
    });

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

async function myLeaves(req, res, next) {
  try {
    const phone = normalizePhone(req.query.phone);
    let studentId = null;
    let teacherUserId = null;

    if (req.user?.role === 'student') {
      const student = await Student.findOne({ userId: req.user.sub });
      studentId = student?._id;
    }
    if (req.user?.role === 'teacher') {
      teacherUserId = req.user.sub;
    }
    if (!studentId && phone) {
      const student = await resolveStudentByPhone(phone);
      studentId = student?._id;
    }
    if (!teacherUserId && phone) {
      const teacher = await resolveTeacherByPhone(phone);
      teacherUserId = teacher?.user?._id || null;
    }

    if (!studentId && !teacherUserId) return res.status(404).json({ message: 'Profile not found' });

    const leaves = await Attendance.find(studentId ? { studentId, status: 'leave' } : { userId: teacherUserId, status: 'leave' }).sort({ leaveFrom: -1 });
    res.json(leaves);
  } catch (err) {
    next(err);
  }
}

async function listLeaves(req, res, next) {
  try {
    const leaves = await Attendance.find({ status: 'leave' })
      .populate('studentId', 'enrollmentNo userId')
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'fullName phone email' } })
      .populate('userId', 'fullName phone email role')
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    next(err);
  }
}

async function updateLeaveStatus(req, res, next) {
  try {
    const { leaveId } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected', 'requested'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const leave = await Attendance.findById(leaveId);
    if (!leave || leave.status !== 'leave') return res.status(404).json({ message: 'Leave not found' });
    leave.leaveStatus = status;
    await leave.save();
    res.json(leave);
  } catch (err) {
    next(err);
  }
}

async function attendanceByStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const data = await Attendance.find({ studentId }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function flaggedAbsentees(req, res, next) {
  try {
    const today = normalizeDate();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);

    const attendance = await Attendance.aggregate([
      {
        $match: {
          date: { $gte: threeDaysAgo },
          studentId: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$studentId',
          lastDate: { $max: '$date' }
        }
      }
    ]);

    const activeStudentIds = attendance.map((a) => a._id.toString());

    const studentsWithoutRecent = await require('../students/student.model')
      .find({ _id: { $nin: activeStudentIds } })
      .select('enrollmentNo userId');

    res.json(studentsWithoutRecent);
  } catch (err) {
    next(err);
  }
}

async function myAttendance(req, res, next) {
  try {
    // Students store attendance by studentId; other roles by userId
    if (req.user.role === 'student') {
      const student = await Student.findOne({ userId: req.user.sub });
      if (!student) return res.json([]);
      const data = await Attendance.find({ studentId: student._id }).sort({ date: -1 });
      return res.json(data);
    }
    const data = await Attendance.find({ userId: req.user.sub }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function resolveStudentByPhone(phoneDigits) {
  const rx = { $regex: `${phoneDigits}$` };
  const user = await User.findOne({ phone: rx });
  if (user) {
    const stu = await Student.findOne({ userId: user._id });
    if (stu) return stu;
  }
  const stu = await Student.findOne({
    $or: [
      { emergencyContact: rx },
      { 'details.guardianMobile': rx },
      { 'details.fatherMobile': rx },
      { 'details.motherMobile': rx }
    ]
  });
  return stu;
}

async function resolveTeacherByPhone(phoneDigits) {
  const rx = { $regex: `${phoneDigits}$` };
  const user = await User.findOne({ phone: rx, role: 'teacher' });
  if (!user) return null;
  return { user };
}

async function publicCheckIn(req, res, next) {
  try {
    const phoneDigits = normalizePhone(req.body.phone || '');
    if (!phoneDigits) return res.status(400).json({ message: 'phone required' });
    const student = await resolveStudentByPhone(phoneDigits);
    const teacher = student ? null : await resolveTeacherByPhone(phoneDigits);
    if (!student && !teacher) return res.status(404).json({ message: 'Profile not found' });
    const date = normalizeDate();
    const now = new Date();

    const existing = await Attendance.findOne(student ? { studentId: student._id, date } : { userId: teacher.user._id, date });
    if (existing?.checkInAt) return res.status(400).json({ message: 'Already checked in today' });

    const geo = await enforceGeofence(req.body.location);
    if (!geo.ok) return res.status(403).json({ message: geo.message });

    if (student && geo.cfg && geo.cfg.checkInTime) {
      const windowOk = withinTimeWindow(geo.cfg.checkInTime, geo.cfg.windowMinutes || 30);
      if (!windowOk) return res.status(403).json({ message: 'Check-in not allowed right now (outside allowed time window)' });
    }

    const record = await Attendance.findOneAndUpdate(
      student ? { studentId: student._id, date } : { userId: teacher.user._id, date },
      {
        studentId: student?._id,
        userId: student?.userId || teacher.user._id,
        batchId: student?.batchId,
        date,
        status: 'present',
        checkInAt: now,
        checkInLocation: req.body.location,
        checkInAddress: (await resolveAddress(req.body.location)) || formatAddressFromLoc(req.body.location),
        isOnLeave: false
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

async function publicCheckOut(req, res, next) {
  try {
    const phoneDigits = normalizePhone(req.body.phone || '');
    if (!phoneDigits) return res.status(400).json({ message: 'phone required' });
    const student = await resolveStudentByPhone(phoneDigits);
    const teacher = student ? null : await resolveTeacherByPhone(phoneDigits);
    if (!student && !teacher) return res.status(404).json({ message: 'Profile not found' });
    const date = normalizeDate();
    const now = new Date();
    const existing = await Attendance.findOne(student ? { studentId: student._id, date } : { userId: teacher.user._id, date });
    if (!existing?.checkInAt) return res.status(404).json({ message: 'No check-in found for today' });
    if (existing.checkOutAt) return res.status(400).json({ message: 'Already checked out today' });

    const geo = await enforceGeofence(req.body.location);
    if (!geo.ok) return res.status(403).json({ message: geo.message });

    if (student && geo.cfg && geo.cfg.checkOutTime) {
      const windowOk = withinTimeWindow(geo.cfg.checkOutTime, geo.cfg.windowMinutes || 30);
      if (!windowOk) return res.status(403).json({ message: 'Check-out not allowed right now (outside allowed time window)' });
    }

    existing.checkOutAt = now;
    existing.checkOutLocation = req.body.location;
    existing.checkOutAddress = (await resolveAddress(req.body.location)) || formatAddressFromLoc(req.body.location);
    existing.status = 'present';
    existing.isOnLeave = false;
    await existing.save();
    res.json(existing);
  } catch (err) {
    next(err);
  }
}

async function publicAttendanceByPhone(req, res, next) {
  try {
    const phoneDigits = normalizePhone(req.params.phone || '');
    if (!phoneDigits) return res.status(400).json({ message: 'phone required' });
    const student = await resolveStudentByPhone(phoneDigits);
    const teacher = student ? null : await resolveTeacherByPhone(phoneDigits);
    if (!student && !teacher) return res.status(404).json({ message: 'Profile not found' });
    const filter = student ? { studentId: student._id } : { userId: teacher.user._id };
    const data = await Attendance.find(filter).sort({ date: -1 }).limit(30);
    res.json(student ? { student, attendance: data } : { teacher, attendance: data });
  } catch (err) {
    next(err);
  }
}

async function deleteLeave(req, res, next) {
  try {
    const { leaveId } = req.params;
    const leave = await Attendance.findById(leaveId);
    if (!leave || leave.status !== 'leave') {
      return res.status(404).json({ message: 'Leave not found' });
    }
    await Attendance.findByIdAndDelete(leaveId);
    res.json({ message: 'Leave deleted' });
  } catch (err) {
    next(err);
  }
}

async function getCheckinConfig(req, res, next) {
  try {
    const cfg = await getActiveCheckinConfig();
    res.json(cfg || null);
  } catch (err) {
    next(err);
  }
}

async function setCheckinConfig(req, res, next) {
  try {
    const { lat, lng, radiusMeters = 500, checkInTime, checkOutTime, windowMinutes = 30 } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ message: 'lat and lng are required' });
    const cfg = await CheckinConfig.create({
      lat: Number(lat),
      lng: Number(lng),
      radiusMeters: Number(radiusMeters) || 500,
      checkInTime,
      checkOutTime,
      windowMinutes: Number(windowMinutes) || 30,
      updatedBy: req.user.sub
    });
    res.status(201).json(cfg);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  markAttendance,
  attendanceByStudent,
  checkIn,
  checkOut,
  requestLeave,
  myAttendance,
  flaggedAbsentees,
  listLeaves,
  updateLeaveStatus,
  deleteLeave,
  publicCheckIn,
  publicCheckOut,
  publicAttendanceByPhone,
  myLeaves,
  // config
  getActiveCheckinConfig,
  enforceGeofence,
  getCheckinConfig,
  setCheckinConfig
};
