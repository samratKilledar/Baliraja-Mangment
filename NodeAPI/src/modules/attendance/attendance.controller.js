const Attendance = require('./attendance.model');
const User = require('../users/user.model');
const Student = require('../students/student.model');
const CheckinConfig = require('./checkinConfig.model');
const Fee = require('../fees/fee.model');
const Teacher = require('../teachers/teacher.model');
const Batch = require('../courses/batch.model');

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
  if (cfg.lat === null || cfg.lat === undefined || cfg.lng === null || cfg.lng === undefined) {
    return { ok: true, cfg };
  }
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
  const start = new Date();
  start.setHours(hh, mm, 0, 0);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + windowMinutes);
  return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

function isSameOrAfterDay(left, right) {
  return left.getTime() >= right.getTime();
}

function isSameOrBeforeDay(left, right) {
  return left.getTime() <= right.getTime();
}

async function ensureStudentActiveForAttendance(studentId, date) {
  if (!studentId) return { ok: true };

  const student = await Student.findById(studentId).select('admissionDate status batchId details');
  if (!student) return { ok: false, status: 404, message: 'Student profile not found' };

  if (student.status && student.status !== 'active') {
    return { ok: false, status: 403, message: 'You are not yet active' };
  }

  const fee = await Fee.findOne({ studentId }).sort({ createdAt: -1 }).select('feeStartDate feeEndDate');
  const activeFrom = fee?.feeStartDate ? normalizeDate(fee.feeStartDate) : (student.admissionDate ? normalizeDate(student.admissionDate) : null);
  const activeTo = fee?.feeEndDate ? normalizeDate(fee.feeEndDate) : null;

  if (activeFrom && !isSameOrAfterDay(date, activeFrom)) {
    return { ok: false, status: 403, message: 'You are not yet active' };
  }

  if (activeTo && !isSameOrBeforeDay(date, activeTo)) {
    return { ok: false, status: 403, message: 'Your active period is over' };
  }

  return { ok: true, student, fee };
}

function toObjectIdStrings(values = []) {
  return values.map((value) => value?.toString()).filter(Boolean);
}

async function getTeacherBatchIds(userId) {
  if (!userId) return [];
  const teacher = await Teacher.findOne({ userId }).select('assignedBatchIds');
  if (!teacher) return [];

  const explicitBatchIds = toObjectIdStrings(teacher.assignedBatchIds || []);
  const linkedBatches = await Batch.find({ teacherId: teacher._id }).select('_id').lean();
  const linkedBatchIds = toObjectIdStrings(linkedBatches.map((batch) => batch._id));

  return Array.from(new Set([...explicitBatchIds, ...linkedBatchIds]));
}

async function canTeacherAccessStudent(reqUser, studentId) {
  if (!studentId || reqUser?.role !== 'teacher') return true;

  const [teacherBatchIds, student] = await Promise.all([
    getTeacherBatchIds(reqUser.sub),
    Student.findById(studentId).select('batchId')
  ]);

  if (!student) {
    return { ok: false, status: 404, message: 'Student profile not found' };
  }

  if (!student.batchId) {
    return { ok: false, status: 403, message: 'Student is not assigned to a division' };
  }

  if (!teacherBatchIds.includes(student.batchId.toString())) {
    return { ok: false, status: 403, message: 'You can only mark attendance for your assigned divisions' };
  }

  return { ok: true, student };
}

function extractAcademicContext(student) {
  const education = student?.details?.education || {};
  const currentClass = education.currentClass || student?.details?.currentClass || '';
  const division = education.division || student?.details?.division || '';
  return { currentClass, division };
}

function resolveSubjectKey(payload = {}) {
  const key = payload.subjectId || payload.subjectName;
  return key ? String(key) : '__daily__';
}

async function markAttendance(req, res, next) {
  try {
    const payload = { ...req.body, markedBy: req.user.sub };
    payload.date = normalizeDate(payload.date);
    payload.subjectKey = resolveSubjectKey(payload);
    payload.lectureCount = Number(payload.lectureCount) || 1;

    if (payload.studentId) {
      const teacherAccess = await canTeacherAccessStudent(req.user, payload.studentId);
      if (teacherAccess !== true && !teacherAccess.ok) {
        return res.status(teacherAccess.status || 403).json({ message: teacherAccess.message });
      }

      const activeState = await ensureStudentActiveForAttendance(payload.studentId, payload.date);
      if (!activeState.ok) {
        return res.status(activeState.status || 403).json({ message: activeState.message });
      }

      payload.batchId = payload.batchId || teacherAccess.student?.batchId || activeState.student?.batchId;
      const academic = extractAcademicContext(activeState.student || teacherAccess.student);
      payload.currentClass = payload.currentClass || academic.currentClass;
      payload.division = payload.division || academic.division;
    }

    const match = payload.studentId
      ? { studentId: payload.studentId, date: payload.date, subjectKey: payload.subjectKey }
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

async function dailyAttendanceOverview(req, res, next) {
  try {
    const date = normalizeDate(req.query.date);
    const filter = {};
    const subjectKey = resolveSubjectKey(req.query);

    if (req.query.batchId) {
      filter.batchId = req.query.batchId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.currentClass) {
      filter['details.education.currentClass'] = req.query.currentClass;
    }

    if (req.user?.role === 'teacher') {
      const teacherBatchIds = await getTeacherBatchIds(req.user.sub);
      if (!teacherBatchIds.length) {
        return res.json([]);
      }
      if (req.query.batchId && !teacherBatchIds.includes(String(req.query.batchId))) {
        return res.status(403).json({ message: 'You can only view your assigned divisions' });
      }
      filter.batchId = req.query.batchId
        ? req.query.batchId
        : { $in: teacherBatchIds };
    }

    const students = await Student.find(filter)
      .populate('userId', 'fullName phone email')
      .populate('batchId', 'batchName capacity')
      .sort({ admissionDate: -1, createdAt: -1 });

    const attendanceRows = await Attendance.find({
      studentId: { $in: students.map((student) => student._id) },
      subjectKey,
      $or: [
        { date },
        { status: 'leave', leaveStatus: 'approved', leaveFrom: { $lte: date }, leaveTo: { $gte: date } }
      ]
    }).lean();

    const attendanceMap = {};
    attendanceRows.forEach((row) => {
      const key = row.studentId?.toString();
      if (!key) return;
      const existing = attendanceMap[key];
      if (!existing) {
        attendanceMap[key] = row;
        return;
      }
      const existingScore = existing.status === 'leave' ? 1 : 2;
      const nextScore = row.status === 'leave' ? 1 : 2;
      if (nextScore >= existingScore) {
        attendanceMap[key] = row;
      }
    });

    res.json(
      students.map((student) => ({
        studentId: student._id,
        enrollmentNo: student.enrollmentNo || '',
        studentName: student.userId?.fullName || 'Student',
        mobileNo: student.userId?.phone || '',
        batchName: student.batchId?.batchName || '',
        batchId: student.batchId?._id || null,
        capacity: Number(student.batchId?.capacity) || 0,
        ...extractAcademicContext(student),
        admissionDate: student.admissionDate || null,
        subjectKey,
        subjectName: attendanceMap[student._id.toString()]?.subjectName || req.query.subjectName || '',
        date,
        attendance: attendanceMap[student._id.toString()] || null
      }))
    );
  } catch (err) {
    next(err);
  }
}

async function teacherRoster(req, res, next) {
  try {
    const date = normalizeDate(req.query.date);
    const subjectKey = resolveSubjectKey(req.query);
    const teacher = await Teacher.findOne({ userId: req.user.sub })
      .populate('userId', 'fullName email phone')
      .lean();

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found' });
    }

    const teacherBatchIds = await getTeacherBatchIds(req.user.sub);
    if (!teacherBatchIds.length) {
      return res.json({ teacher, date, batches: [] });
    }

    const students = await Student.find({ batchId: { $in: teacherBatchIds }, status: 'active' })
      .populate('userId', 'fullName phone')
      .populate('batchId', 'batchName capacity')
      .sort({ 'details.education.currentClass': 1, 'details.education.division': 1, createdAt: 1 })
      .lean();

    const availableClasses = Array.from(
      new Set(
        students
          .map((student) => extractAcademicContext(student).currentClass)
          .filter(Boolean)
      )
    );
    const selectedClass = req.query.currentClass || availableClasses[0] || '';
    const filteredStudents = selectedClass
      ? students.filter((student) => extractAcademicContext(student).currentClass === selectedClass)
      : students;

    const records = await Attendance.find({
      studentId: { $in: filteredStudents.map((student) => student._id) },
      date,
      subjectKey
    }).lean();

    const attendanceMap = new Map(records.map((record) => [record.studentId?.toString(), record]));
    const batches = [];
    const batchMap = new Map();

    filteredStudents.forEach((student) => {
      const key = student.batchId?._id?.toString() || 'unassigned';
      if (!batchMap.has(key)) {
        const academic = extractAcademicContext(student);
        const item = {
          batchId: student.batchId?._id || null,
          batchName: student.batchId?.batchName || 'Unassigned Division',
          capacity: Number(student.batchId?.capacity) || 0,
          currentClass: academic.currentClass,
          division: academic.division,
          students: []
        };
        batchMap.set(key, item);
        batches.push(item);
      }

      const activeStateStart = student.admissionDate ? normalizeDate(student.admissionDate) : null;
      batchMap.get(key).students.push({
        studentId: student._id,
        enrollmentNo: student.enrollmentNo || '',
        studentName: student.userId?.fullName || 'Student',
        mobileNo: student.userId?.phone || '',
        admissionDate: student.admissionDate || null,
        currentClass: extractAcademicContext(student).currentClass,
        division: extractAcademicContext(student).division,
        attendance: attendanceMap.get(student._id.toString()) || null,
        attendanceAllowed: !activeStateStart || date.getTime() >= activeStateStart.getTime()
      });
    });

    res.json({ teacher, date, subjectKey, selectedClass, availableClasses, batches });
  } catch (err) {
    next(err);
  }
}

async function classAttendanceSummary(req, res, next) {
  try {
    const date = normalizeDate(req.query.date);
    const subjectKey = resolveSubjectKey(req.query);
    const studentFilter = { status: 'active' };

    if (req.query.currentClass) {
      studentFilter['details.education.currentClass'] = req.query.currentClass;
    }

    const students = await Student.find(studentFilter)
      .populate('batchId', 'batchName capacity')
      .select('batchId admissionDate details')
      .lean();

    const studentIds = students.map((student) => student._id);
    const attendanceRows = await Attendance.find({
      studentId: { $in: studentIds },
      date,
      subjectKey
    }).lean();
    const attendanceMap = new Map(attendanceRows.map((row) => [row.studentId?.toString(), row]));

    const grouped = new Map();

    students.forEach((student) => {
      const academic = extractAcademicContext(student);
      const classKey = academic.currentClass || 'Unassigned';
      const divisionKey = academic.division || student.batchId?.batchName || 'General';
      const groupKey = `${classKey}__${divisionKey}__${student.batchId?._id || 'none'}`;
      if (!grouped.has(groupKey)) {
        grouped.set(groupKey, {
          currentClass: classKey,
          division: divisionKey,
          batchId: student.batchId?._id || null,
          batchName: student.batchId?.batchName || 'No batch',
          capacity: Number(student.batchId?.capacity) || 0,
          totalStudents: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          leaveCount: 0,
          notMarkedCount: 0
        });
      }

      const group = grouped.get(groupKey);
      const activeFrom = student.admissionDate ? normalizeDate(student.admissionDate) : null;
      const isActiveForDate = !activeFrom || date.getTime() >= activeFrom.getTime();
      if (!isActiveForDate) {
        return;
      }

      group.totalStudents += 1;

      const attendance = attendanceMap.get(student._id.toString());
      if (!attendance) {
        group.notMarkedCount += 1;
        return;
      }

      if (attendance.status === 'present') group.presentCount += 1;
      else if (attendance.status === 'absent') group.absentCount += 1;
      else if (attendance.status === 'late') group.lateCount += 1;
      else if (attendance.status === 'leave') group.leaveCount += 1;
      else group.notMarkedCount += 1;
    });

    const items = Array.from(grouped.values())
      .filter((item) => ['11th Std', '12th Std', 'Summer Camp'].includes(item.currentClass))
      .sort((left, right) => `${left.currentClass}-${left.division}`.localeCompare(`${right.currentClass}-${right.division}`));

    res.json({ date, subjectKey, items });
  } catch (err) {
    next(err);
  }
}

async function attendanceReport(req, res, next) {
  try {
    const fromDate = normalizeDate(req.query.fromDate);
    const toDate = normalizeDate(req.query.toDate || req.query.fromDate);
    const subjectKey = resolveSubjectKey(req.query);
    const studentFilter = { status: 'active' };

    if (req.query.currentClass) {
      studentFilter['details.education.currentClass'] = req.query.currentClass;
    }

    if (req.query.batchId) {
      studentFilter.batchId = req.query.batchId;
    }

    if (req.user?.role === 'teacher') {
      const teacherBatchIds = await getTeacherBatchIds(req.user.sub);
      if (!teacherBatchIds.length) {
        return res.json({ fromDate, toDate, items: [] });
      }
      studentFilter.batchId = req.query.batchId
        ? req.query.batchId
        : { $in: teacherBatchIds };
    }

    const students = await Student.find(studentFilter)
      .populate('userId', 'fullName phone')
      .populate('batchId', 'batchName capacity')
      .sort({ 'details.education.currentClass': 1, 'details.education.division': 1, createdAt: 1 })
      .lean();

    const attendanceRows = await Attendance.find({
      studentId: { $in: students.map((student) => student._id) },
      date: { $gte: fromDate, $lte: toDate },
      subjectKey
    }).lean();

    const groupedRows = attendanceRows.reduce((acc, row) => {
      const key = row.studentId?.toString();
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});

    const items = students.map((student) => {
      const rows = groupedRows[student._id.toString()] || [];
      const totalLectures = rows.reduce((sum, row) => sum + (Number(row.lectureCount) || 1), 0);
      const presentLectures = rows.reduce((sum, row) => (
        row.status === 'present' ? sum + (Number(row.lectureCount) || 1) : sum
      ), 0);
      const lateLectures = rows.reduce((sum, row) => (
        row.status === 'late' ? sum + (Number(row.lectureCount) || 1) : sum
      ), 0);
      const attendancePercentage = totalLectures > 0
        ? Number((((presentLectures + lateLectures) / totalLectures) * 100).toFixed(2))
        : 0;
      const academic = extractAcademicContext(student);

      return {
        studentId: student._id,
        studentName: student.userId?.fullName || 'Student',
        enrollmentNo: student.enrollmentNo || '',
        batchName: student.batchId?.batchName || '',
        currentClass: academic.currentClass,
        division: academic.division,
        totalLectures,
        presentLectures,
        lateLectures,
        absentLectures: rows.reduce((sum, row) => (
          row.status === 'absent' ? sum + (Number(row.lectureCount) || 1) : sum
        ), 0),
        leaveLectures: rows.reduce((sum, row) => (
          row.status === 'leave' ? sum + (Number(row.lectureCount) || 1) : sum
        ), 0),
        attendancePercentage
      };
    });

    res.json({
      fromDate,
      toDate,
      subjectKey,
      items
    });
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

    const activeState = await ensureStudentActiveForAttendance(studentId, date);
    if (!activeState.ok) {
      return res.status(activeState.status || 403).json({ message: activeState.message });
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

    const activeState = await ensureStudentActiveForAttendance(studentId, date);
    if (!activeState.ok) {
      return res.status(activeState.status || 403).json({ message: activeState.message });
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

    if (student) {
      const activeState = await ensureStudentActiveForAttendance(student._id, date);
      if (!activeState.ok) {
        return res.status(activeState.status || 403).json({ message: activeState.message });
      }
    }

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

    if (student) {
      const activeState = await ensureStudentActiveForAttendance(student._id, date);
      if (!activeState.ok) {
        return res.status(activeState.status || 403).json({ message: activeState.message });
      }
    }

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
    const {
      lat,
      lng,
      radiusMeters = 500,
      checkInTime,
      checkOutTime,
      windowMinutes = 30
    } = req.body;
    const hasLat = lat !== undefined && lat !== null && String(lat).trim() !== '';
    const hasLng = lng !== undefined && lng !== null && String(lng).trim() !== '';
    if (hasLat !== hasLng) return res.status(400).json({ message: 'Both lat and lng are required together' });
    const cfg = await CheckinConfig.create({
      lat: hasLat ? Number(lat) : null,
      lng: hasLng ? Number(lng) : null,
      radiusMeters: Number(radiusMeters) || 500,
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
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
  dailyAttendanceOverview,
  teacherRoster,
  classAttendanceSummary,
  attendanceReport,
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
