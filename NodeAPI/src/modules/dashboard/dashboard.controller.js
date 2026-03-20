const Student = require('../students/student.model');
const Teacher = require('../teachers/teacher.model');
const Worker = require('../workers/worker.model');
const Fee = require('../fees/fee.model');

async function superAdminDashboard(req, res, next) {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 5);
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 7 * 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 13);

    const [studentCount, teacherCount, workerCount, feeSummary, monthAdmissions, weekAdmissions, dayAdmissions] = await Promise.all([
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
      ])
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

    const revenuePass = req.query.revenuePass || req.headers['x-revenue-pass'];
    const revenueAllowed = process.env.REVENUE_PASS ? revenuePass === process.env.REVENUE_PASS : true;

    res.json({
      studentCount,
      teacherCount,
      workerCount,
      fees: feeSummary[0] || { totalExpected: 0, totalCollected: 0, totalDue: 0 },
      revenueLocked: !revenueAllowed,
      revenue: revenueAllowed ? (feeSummary[0]?.totalCollected || 0) : undefined,
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
