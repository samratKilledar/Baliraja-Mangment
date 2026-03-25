const Subject = require('./subject.model');

async function listSubjects(req, res, next) {
  try {
    const filter = { isActive: true };
    if (req.query.currentClass) {
      filter.$or = [
        { currentClasses: req.query.currentClass },
        { currentClasses: { $size: 0 } }
      ];
    }
    const subjects = await Subject.find(filter).sort({ name: 1 });
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
        ? req.body.currentClasses.filter((value) => ['11th Std', '12th Std'].includes(value))
        : [],
      createdBy: req.user?.sub
    };

    if (!payload.name) {
      return res.status(400).json({ message: 'Subject name is required' });
    }

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
