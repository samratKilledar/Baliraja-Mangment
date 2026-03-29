const Teacher = require('./teacher.model');
const User = require('../users/user.model');
const Attendance = require('../attendance/attendance.model');
const mongoose = require('mongoose');
const { decryptPassword } = require('../../utils/passwordVault');

function safeDate(value) {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function deriveContractDuration(start, end) {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  const totalDays = Math.max(0, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));
  return {
    months: Math.floor(totalDays / 30),
    days: totalDays % 30,
    totalDays
  };
}

function shapeTeacher(teacher, role) {
  if (!teacher) return null;
  const obj = teacher.toObject ? teacher.toObject() : teacher;
  if (obj.userId?.passwordCipher && ['super_admin', 'admin'].includes(role)) {
    obj.userId.passwordVisible = decryptPassword(obj.userId.passwordCipher);
  }
  if (obj.userId?.passwordCipher) {
    delete obj.userId.passwordCipher;
  }
  obj.remainingAmount =
    obj.totalContractAmount !== undefined
      ? obj.totalContractAmount - (obj.paidAmount || 0)
      : undefined;
  obj.contractDuration = deriveContractDuration(obj.contractStart, obj.contractEnd);
  obj.totalLectures = (obj.lectureLogs || []).reduce((sum, log) => sum + (log.count || 0), 0);
  obj.totalLectureHours = (obj.lectureLogs || []).reduce((sum, log) => sum + (log.hours || 0), 0);
  obj.salaryBalance = obj.monthlySalary !== undefined ? (obj.monthlySalary - (obj.salaryPaidAmount || 0)) : undefined;
  if (role !== 'super_admin') {
    delete obj.totalContractAmount;
  }
  return obj;
}

async function listTeachers(req, res, next) {
  try {
    const { from, to } = req.query;
    const filter = {};
    // Limit teachers to self when logged in as teacher
    if (req.user.role === 'teacher') {
      const selfTeacher = await Teacher.findOne({ userId: req.user.sub });
      if (!selfTeacher) return res.json([]);
      filter._id = selfTeacher._id;
    }
    if (from || to) {
      filter.contractStart = {};
      if (from) filter.contractStart.$gte = new Date(from);
      if (to) filter.contractStart.$lte = new Date(to);
    }

    let teachers = await Teacher.find(filter)
      .populate('userId', 'fullName email phone passwordCipher');

    teachers = teachers.map((t) => shapeTeacher(t, req.user.role));

    res.json(teachers);
  } catch (err) {
    next(err);
  }
}

async function updateTeacher(req, res, next) {
  try {
    const { teacherId } = req.params;
    const payload = req.body;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    if (payload.fullName || payload.email || payload.phone) {
      const user = await User.findById(teacher.userId);
      if (user) {
        if (payload.fullName) user.fullName = payload.fullName;
        if (payload.email) user.email = payload.email;
        if (payload.phone) user.phone = payload.phone;
        await user.save();
      }
    }

    if (payload.specialization) teacher.specialization = payload.specialization;
    if (payload.experienceYears !== undefined) teacher.experienceYears = payload.experienceYears;
    if (payload.contractStart) teacher.contractStart = payload.contractStart;
    if (payload.contractEnd) teacher.contractEnd = payload.contractEnd;
    if (payload.totalContractAmount !== undefined && req.user.role === 'super_admin') {
      teacher.totalContractAmount = payload.totalContractAmount;
    }
    if (payload.monthlySalary !== undefined) teacher.monthlySalary = payload.monthlySalary;

    await teacher.save();
    const refreshed = await Teacher.findById(teacherId).populate('userId', 'fullName email phone passwordCipher');
    res.json(shapeTeacher(refreshed, req.user.role));
  } catch (err) {
    next(err);
  }
}

async function addPayment(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { amount, note, paymentType = 'contract', monthOf } = req.body;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    if (!['contract', 'salary'].includes(paymentType)) {
      return res.status(400).json({ message: 'Invalid payment type' });
    }

    teacher.payments.push({
      amount,
      note,
      paymentType,
      monthOf,
      receivedBy: req.user.sub
    });
    if (paymentType === 'salary') {
      teacher.salaryPaidAmount += amount;
    } else {
      teacher.paidAmount += amount;
    }
    await teacher.save();

    res.json(shapeTeacher(teacher, req.user.role));
  } catch (err) {
    next(err);
  }
}

async function extendContract(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { newEndDate, extendMonths, note } = req.body;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const currentEnd = teacher.contractEnd || teacher.contractStart || new Date();
    let target = newEndDate ? new Date(newEndDate) : new Date(currentEnd);
    if (extendMonths) {
      target.setMonth(target.getMonth() + Number(extendMonths));
    }

    teacher.contractExtensions.push({
      from: teacher.contractEnd || teacher.contractStart,
      to: target,
      note,
      extendedBy: req.user.sub
    });
    teacher.contractEnd = target;
    await teacher.save();

    res.json(shapeTeacher(teacher, req.user.role));
  } catch (err) {
    next(err);
  }
}

async function addLectureLog(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { date, count = 1, note, startTime, endTime, hours, subject, studentCount } = req.body;
    let teacher = mongoose.Types.ObjectId.isValid(teacherId)
      ? await Teacher.findById(teacherId)
      : null;
    if (!teacher) {
      teacher = await Teacher.findOne({ userId: teacherId });
    }
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    if (req.user.role === 'teacher' && String(teacher.userId) !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const parsedStart = safeDate(startTime);
    const parsedEnd = safeDate(endTime);
    let derivedHours = hours;
    if (derivedHours === undefined && parsedStart && parsedEnd) {
      derivedHours = Math.max(0, (parsedEnd - parsedStart) / (1000 * 60 * 60));
    }

    if (parsedStart && parsedEnd) {
      const overlap = (teacher.lectureLogs || []).some((log) => {
        if (!log.startTime || !log.endTime) return false;
        if (date && new Date(log.date).toDateString() !== new Date(date).toDateString()) return false;
        const lStart = new Date(log.startTime).getTime();
        const lEnd = new Date(log.endTime).getTime();
        return parsedStart.getTime() < lEnd && parsedEnd.getTime() > lStart;
      });
      if (overlap) return res.status(400).json({ message: 'Duplicate session in the same time window' });
    }

    teacher.lectureLogs.push({
      date: date ? new Date(date) : new Date(),
      count,
      subject,
      studentCount,
      startTime: parsedStart,
      endTime: parsedEnd,
      hours: derivedHours,
      note,
      recordedBy: req.user.sub
    });
    await teacher.save();

    res.status(201).json(shapeTeacher(teacher, req.user.role));
  } catch (err) {
    next(err);
  }
}

async function publicAddLectureLog(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { date, count = 1, note, startTime, endTime, hours, subject, studentCount } = req.body;
    let teacher = mongoose.Types.ObjectId.isValid(teacherId)
      ? await Teacher.findById(teacherId)
      : null;
    if (!teacher) {
      teacher = await Teacher.findOne({ userId: teacherId });
    }
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const parsedStart = safeDate(startTime);
    const parsedEnd = safeDate(endTime);
    let derivedHours = hours;
    if (derivedHours === undefined && parsedStart && parsedEnd) {
      derivedHours = Math.max(0, (parsedEnd - parsedStart) / (1000 * 60 * 60));
    }

    if (parsedStart && parsedEnd) {
      const overlap = (teacher.lectureLogs || []).some((log) => {
        if (!log.startTime || !log.endTime) return false;
        if (date && new Date(log.date).toDateString() !== new Date(date).toDateString()) return false;
        const lStart = new Date(log.startTime).getTime();
        const lEnd = new Date(log.endTime).getTime();
        return parsedStart.getTime() < lEnd && parsedEnd.getTime() > lStart;
      });
      if (overlap) return res.status(400).json({ message: 'Duplicate session in the same time window' });
    }

    teacher.lectureLogs.push({
      date: date ? new Date(date) : new Date(),
      count,
      subject,
      studentCount,
      startTime: parsedStart,
      endTime: parsedEnd,
      hours: derivedHours,
      note
    });
    await teacher.save();
    const refreshed = await Teacher.findById(teacherId).populate('userId', 'fullName email phone');
    res.status(201).json(shapeTeacher(refreshed, 'teacher'));
  } catch (err) {
    next(err);
  }
}

async function listLectureLogs(req, res, next) {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    if (req.user.role === 'teacher' && String(teacher.userId) !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const limit = Math.min(Number(req.query.limit) || 120, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const logs = (teacher.lectureLogs || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(skip, skip + limit)
      .map((l) => ({
        id: l._id,
        date: l.date,
        subject: l.subject || '—',
        studentCount: l.studentCount ?? l.count ?? 0,
        startTime: l.startTime,
        endTime: l.endTime,
        count: l.count,
        hours: l.hours,
        note: l.note
      }));
    const totalLectures = logs.reduce((s, l) => s + (l.count || 0), 0);
    const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0);
    res.json({ logs, totalLectures, totalHours });
  } catch (err) {
    next(err);
  }
}

async function publicLectureLogs(req, res, next) {
  try {
    const { teacherId } = req.params;
    let teacher = mongoose.Types.ObjectId.isValid(teacherId) ? await Teacher.findById(teacherId) : null;
    if (!teacher) teacher = await Teacher.findOne({ userId: teacherId });
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

    const limit = Math.min(Number(req.query.limit) || 120, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const logs = (teacher.lectureLogs || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(skip, skip + limit)
      .map((l) => ({
        id: l._id,
        date: l.date,
        subject: l.subject || '—',
        studentCount: l.studentCount ?? l.count ?? 0,
        startTime: l.startTime,
        endTime: l.endTime,
        count: l.count,
        hours: l.hours,
        note: l.note
      }));
    const totalLectures = logs.reduce((s, l) => s + (l.count || 0), 0);
    const totalHours = logs.reduce((s, l) => s + (l.hours || 0), 0);
    res.json({ logs, totalLectures, totalHours });
  } catch (err) {
    next(err);
  }
}

async function listRecentLectures(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const skip = Math.max(Number(req.query.skip) || 0, 0);
    const days = Number(req.query.days) || 365;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const pipeline = [
      { $unwind: '$lectureLogs' },
      ...(days ? [{ $match: { 'lectureLogs.date': { $gte: fromDate } } }] : []),
      { $sort: { 'lectureLogs.date': -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          teacherId: '$_id',
          teacherName: '$user.fullName',
          phone: '$user.phone',
          subject: { $ifNull: ['$lectureLogs.subject', '—'] },
          studentCount: {
            $ifNull: [
              '$lectureLogs.studentCount',
              { $ifNull: ['$lectureLogs.count', 0] }
            ]
          },
          date: '$lectureLogs.date',
          startTime: '$lectureLogs.startTime',
          endTime: '$lectureLogs.endTime',
          note: { $ifNull: ['$lectureLogs.note', '—'] },
          count: '$lectureLogs.count',
          hours: { $ifNull: ['$lectureLogs.hours', null] }
        }
      }
    ];

    const records = await Teacher.aggregate(pipeline);
    res.json(records);
  } catch (err) {
    next(err);
  }
}

async function teacherAttendance(req, res, next) {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    if (req.user.role === 'teacher' && String(teacher.userId) !== req.user.sub) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const records = await Attendance.find({ userId: teacher.userId }).sort({ date: -1 }).limit(60);
    res.json(records);
  } catch (err) {
    next(err);
  }
}

async function publicTeacherByPhone(req, res, next) {
  try {
    const { phone } = req.params;
    if (!phone) return res.status(400).json({ message: 'Phone required' });
    const user = await User.findOne({ phone }).lean();
    if (!user || user.role !== 'teacher') return res.status(404).json({ message: 'Not found' });
    const teacher = await Teacher.findOne({ userId: user._id }).lean();
    if (!teacher) return res.status(404).json({ message: 'Not found' });
    return res.json({ teacher, user });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
