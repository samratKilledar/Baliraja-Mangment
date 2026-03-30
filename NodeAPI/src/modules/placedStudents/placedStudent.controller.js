const PlacedStudent = require('./placedStudent.model');
const { normalizePagination, buildPaginationMeta } = require('../../utils/pagination');

async function createPlacedStudent(req, res, next) {
  try {
    const payload = req.body || {};
    if (!payload.placedDate) return res.status(400).json({ message: 'placedDate is required' });
    if (!payload.name) return res.status(400).json({ message: 'name is required' });

    const created = await PlacedStudent.create({
      ...payload,
      createdBy: req.user?.sub,
      createdByRole: req.user?.role
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

async function listPlacedStudents(req, res, next) {
  try {
    const { q } = req.query;
    const { page, limit, skip } = normalizePagination(req.query, 20, 200);
    const filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { mobileNo: { $regex: q, $options: 'i' } },
        { batch: { $regex: q, $options: 'i' } },
        { academicYear: { $regex: q, $options: 'i' } },
      ];
    }

    const [total, items] = await Promise.all([
      PlacedStudent.countDocuments(filter),
      PlacedStudent.find(filter)
        .populate('studentId', 'enrollmentNo userId details')
        .populate({ path: 'studentId', populate: { path: 'userId', select: 'fullName phone email' } })
        .sort({ placedDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
    ]);

    res.json({
      items,
      meta: buildPaginationMeta({ total, page, limit })
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPlacedStudent,
  listPlacedStudents
};
