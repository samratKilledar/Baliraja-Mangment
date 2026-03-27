const Subject = require('./subject.model');
const Teacher = require('../teachers/teacher.model');
const ALLOWED_CLASSES = ['11th Std', '12th Std', 'Summer Camp', 'Trainning'];

function buildSubjectCode(name = '') {
  const normalized = String(name || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 12) || 'SUBJECT';
  const randomNo = String(Math.floor(1000 + Math.random() * 9000));
  return `SUB-${normalized}-${randomNo}`;
}

async function generateUniqueSubjectCode(name = '') {
  let code = buildSubjectCode(name);
  let exists = await Subject.findOne({ code }).select('_id').lean();
  while (exists) {
    code = buildSubjectCode(name);
    // eslint-disable-next-line no-await-in-loop
    exists = await Subject.findOne({ code }).select('_id').lean();
  }
  return code;
}

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
    const subjectName = String(req.body.name || '').trim();
    const payload = {
      name: subjectName,
      code: '',
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
    const existingByName = await Subject.findOne({ name: payload.name }).collation({ locale: 'en', strength: 2 }).lean();
    if (existingByName) {
      return res.status(409).json({ message: 'Subject already exists' });
    }
    payload.code = await generateUniqueSubjectCode(payload.name);

    if (payload.teacherId) {
      const teacher = await Teacher.findById(payload.teacherId).populate('userId', 'fullName').lean();
      if (!teacher) {
        return res.status(400).json({ message: 'Selected teacher not found' });
      }
      payload.teacherName = teacher.userId?.fullName || '';
    }

    const subject = await Subject.create(payload);
    res.status(201).json(subject);
  } catch (err) {
    if (err?.code === 11000) {
      if (err?.keyPattern?.name) {
        return res.status(409).json({ message: 'Subject already exists' });
      }
      if (err?.keyPattern?.code) {
        return res.status(409).json({ message: 'Duplicate subject code generated. Please try again.' });
      }
      return res.status(409).json({ message: 'Duplicate subject details' });
    }
    next(err);
  }
}

module.exports = {
  listSubjects,
  createSubject
};
