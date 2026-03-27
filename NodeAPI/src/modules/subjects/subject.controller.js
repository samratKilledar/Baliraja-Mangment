const Subject = require('./subject.model');
const Teacher = require('../teachers/teacher.model');
const ALLOWED_CLASSES = ['11th Std', '12th Std', 'Trainning'];

async function listSubjects(req, res, next) {
  try {
    const filter = { isActive: true };
    if (req.query.currentClass) {
      filter.$or = [
        { currentClasses: req.query.currentClass },
        { currentClasses: { $size: 0 } }
      ];
    }
    const subjects = await Subject.find(filter)
      .populate({ path: 'teacherId', populate: { path: 'userId', select: 'fullName' } })
      .sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    next(err);
  }
}

async function createSubject(req, res, next) {
  try {
    const payload = {
      name: String(req.body.name || '').trim(),
      code: String(req.body.code || '').trim(),
      currentClasses: Array.isArray(req.body.currentClasses)
        ? req.body.currentClasses.filter((value) => ALLOWED_CLASSES.includes(value))
        : [],
      teacherId: req.body.teacherId || undefined,
      teacherName: '',
      createdBy: req.user?.sub
    };

    if (!payload.name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }
    if (!payload.teacherId) {
      return res.status(400).json({ message: 'Teacher is required' });
    }

    const teacher = await Teacher.findById(payload.teacherId).populate('userId', 'fullName').lean();
    if (!teacher) {
      return res.status(400).json({ message: 'Selected teacher not found' });
    }
    payload.teacherName = teacher.userId?.fullName || '';

    const subject = await Subject.create(payload);
    res.status(201).json(subject);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSubjects,
  createSubject
};
