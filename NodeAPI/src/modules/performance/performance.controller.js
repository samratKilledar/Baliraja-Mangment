const Performance = require('./performance.model');

async function createPerformance(req, res, next) {
  try {
    const payload = { ...req.body, recordedBy: req.user.sub };
    const record = await Performance.create(payload);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

async function getPerformanceByStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const records = await Performance.find({ studentId }).sort({ evaluatedOn: -1 });
    res.json(records);
  } catch (err) {
    next(err);
  }
}

module.exports = { createPerformance, getPerformanceByStudent };
