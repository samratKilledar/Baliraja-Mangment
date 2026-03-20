const Fee = require('../fees/fee.model');
const Performance = require('../performance/performance.model');

async function feeReport(req, res, next) {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const rows = await Fee.find(filter).populate('studentId', 'enrollmentNo').lean();
    res.json({ generatedAt: new Date().toISOString(), totalRecords: rows.length, rows });
  } catch (err) {
    next(err);
  }
}

async function performanceReport(req, res, next) {
  try {
    const rows = await Performance.find().sort({ evaluatedOn: -1 }).limit(500).lean();
    res.json({ generatedAt: new Date().toISOString(), totalRecords: rows.length, rows });
  } catch (err) {
    next(err);
  }
}

module.exports = { feeReport, performanceReport };
