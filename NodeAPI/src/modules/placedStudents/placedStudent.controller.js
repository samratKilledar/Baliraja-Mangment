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

async function updatePlacedStudent(req, res, next) {
  try {
    const { placedStudentId } = req.params;
    const payload = req.body || {};
    if (!payload.placedDate) return res.status(400).json({ message: 'placedDate is required' });
    if (!payload.name) return res.status(400).json({ message: 'name is required' });

    const updated = await PlacedStudent.findByIdAndUpdate(
      placedStudentId,
      {
        ...payload,
        createdBy: req.user?.sub,
        createdByRole: req.user?.role
      },
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ message: 'Placed student not found' });
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function listPlacedStudents(req, res, next) {
  try {
    const { q, field, placementType, academicYear } = req.query;
    const { page, limit, skip } = normalizePagination(req.query, 20, 200);
    const filter = {};

    const allowedFields = ['name', 'enrollmentNo', 'mobileNo', 'batch', 'academicYear', 'placementType', 'opinion', 'note'];
    if (q && field && allowedFields.includes(field)) {
      filter[field] = { $regex: q, $options: 'i' };
    } else if (q) {
      filter.$or = allowedFields.map((item) => ({ [item]: { $regex: q, $options: 'i' } }));
    }
    if (placementType) filter.placementType = { $regex: placementType, $options: 'i' };
    if (academicYear) filter.academicYear = { $regex: academicYear, $options: 'i' };

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

async function deletePlacedStudent(req, res, next) {
  try {
    const { placedStudentId } = req.params;
    const deleted = await PlacedStudent.findByIdAndDelete(placedStudentId);
    if (!deleted) return res.status(404).json({ message: 'Placed student not found' });
    res.json({ message: 'Placed student deleted' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createPlacedStudent,
  updatePlacedStudent,
  listPlacedStudents,
  deletePlacedStudent
};
