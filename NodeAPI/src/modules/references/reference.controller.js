const Reference = require('./reference.model');
const { normalizePagination, buildPaginationMeta } = require('../../utils/pagination');

function sanitizeText(value = '') {
  return String(value || '').trim();
}

async function createReference(req, res, next) {
  try {
    const payload = req.body || {};
    const studentName = sanitizeText(payload.studentName);
    const mobileNo = sanitizeText(payload.mobileNo);
    const address = sanitizeText(payload.address);
    const note = sanitizeText(payload.note);
    const source = payload.source === 'android' ? 'android' : 'web';

    if (!studentName) return res.status(400).json({ message: 'studentName is required' });
    if (!mobileNo) return res.status(400).json({ message: 'mobileNo is required' });
    if (!address) return res.status(400).json({ message: 'address is required' });

    const created = await Reference.create({
      studentName,
      mobileNo,
      address,
      note,
      source,
      createdBy: req.user?.sub,
      createdByRole: req.user?.role
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
}

async function listReferences(req, res, next) {
  try {
    const { q, source } = req.query;
    const { page, limit, skip } = normalizePagination(req.query, 20, 200);
    const filter = {};

    if (q) {
      const regex = { $regex: String(q).trim(), $options: 'i' };
      filter.$or = [
        { studentName: regex },
        { mobileNo: regex },
        { address: regex },
        { note: regex }
      ];
    }
    if (source && ['android', 'web'].includes(source)) {
      filter.source = source;
    }

    const [total, items] = await Promise.all([
      Reference.countDocuments(filter),
      Reference.find(filter)
        .populate('createdBy', 'fullName phone email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    return res.json({
      items,
      meta: buildPaginationMeta({ total, page, limit })
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createReference,
  listReferences
};
