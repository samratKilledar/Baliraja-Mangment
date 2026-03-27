const bcrypt = require('bcryptjs');
const Student = require('../students/student.model');
const Teacher = require('../teachers/teacher.model');
const Worker = require('../workers/worker.model');
const Fee = require('../fees/fee.model');
const User = require('../users/user.model');
const Attendance = require('../attendance/attendance.model');

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function superAdminDashboard(req, res, next) {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 7 * 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 13);

    const today = normalizeDate();

    const [totalUsers, studentCount, teacherCount, workerCount, feeSummary, monthAdmissions, weekAdmissions, dayAdmissions, classStudents, todayAttendance] = await Promise.all([
      User.countDocuments(),
      Student.countDocuments(),
      Teacher.countDocuments(),
      Worker.countDocuments(),
      Fee.aggregate([
        {
          $group: {
            _id: null,
            totalExpected: { $sum: '$totalAmount' },
            totalCollected: { $sum: '$paidAmount' },
            totalDue: { $sum: '$dueAmount' }
          }
        }
      ]),
      Student.aggregate([
        { $match: { admissionDate: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { y: { $year: '$admissionDate' }, m: { $month: '$admissionDate' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } }
      ]),
      Student.aggregate([
        { $match: { admissionDate: { $gte: eightWeeksAgo } } },
        {
          $group: {
            _id: { y: { $isoWeekYear: '$admissionDate' }, w: { $isoWeek: '$admissionDate' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.y': 1, '_id.w': 1 } }
      ]),
      Student.aggregate([
        { $match: { admissionDate: { $gte: twoWeeksAgo } } },
        {
          $group: {
            _id: { d: { $dateToString: { format: '%Y-%m-%d', date: '$admissionDate' } } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.d': 1 } }
      ]),
      Student.find({ status: 'active', 'details.education.currentClass': { $in: ['11th Std', '12th Std'] } })
        .populate('batchId', 'batchName capacity')
        .select('admissionDate batchId details')
        .lean(),
      Attendance.find({ date: today }).select('studentId status').lean()
    ]);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const byMonth = monthAdmissions.map((m) => ({
      label: `${monthNames[(m._id.m || 1) - 1]} ${m._id.y}`,
      count: m.count
    }));
    const byWeek = weekAdmissions.map((w) => ({
      label: `W${w._id.w} ${w._id.y}`,
      count: w.count
    }));
    const byDay = dayAdmissions.map((d) => ({
      label: d._id.d,
      count: d.count
    }));

    const rawRevenuePass = req.query.revenuePass ?? req.headers['x-revenue-pass'];
    const revenuePass = typeof rawRevenuePass === 'string' ? rawRevenuePass : '';
    const canViewRevenue = ['super_admin', 'admin'].includes(req.user?.role);
    let revenueAllowed = false;
    if (canViewRevenue && revenuePass) {
      const authUser = await User.findById(req.user.sub).select('passwordHash').lean();
      if (authUser?.passwordHash) {
        revenueAllowed = await bcrypt.compare(revenuePass, authUser.passwordHash);
      }
    }
    const attendanceMap = new Map(todayAttendance.map((row) => [row.studentId?.toString(), row.status]));
    const classCapacityMap = new Map();

    classStudents.forEach((student) => {
      const education = student.details?.education || {};
      const currentClass = education.currentClass || 'Unassigned';
      const division = education.division || student.batchId?.batchName || 'General';
      const key = `${currentClass}__${division}__${student.batchId?._id || 'none'}`;
      if (!classCapacityMap.has(key)) {
        classCapacityMap.set(key, {
          currentClass,
          division,
          batchName: student.batchId?.batchName || 'No batch',
          batchId: student.batchId?._id || null,
          capacity: Number(student.batchId?.capacity) || 0,
          totalStudents: 0,
          presentCount: 0
        });
      }

      const item = classCapacityMap.get(key);
      const activeFrom = student.admissionDate ? normalizeDate(student.admissionDate) : null;
      if (activeFrom && today.getTime() < activeFrom.getTime()) {
        return;
      }

      item.totalStudents += 1;
      if (attendanceMap.get(student._id.toString()) === 'present') {
        item.presentCount += 1;
      }
    });

    res.json({
      totalUsers,
      studentCount,
      teacherCount,
      workerCount,
      fees: feeSummary[0] || { totalExpected: 0, totalCollected: 0, totalDue: 0 },
      revenueLocked: !revenueAllowed,
      revenue: revenueAllowed ? (feeSummary[0]?.totalCollected || 0) : undefined,
      classCapacitySummary: Array.from(classCapacityMap.values()).sort((left, right) =>
        `${left.currentClass}-${left.division}`.localeCompare(`${right.currentClass}-${right.division}`)
      ),
      admissions: {
        month: byMonth,
        week: byWeek,
        day: byDay
      }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { superAdminDashboard };
