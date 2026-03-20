const Course = require('./course.model');
const Batch = require('./batch.model');

async function createCourse(req, res, next) {
  try {
    const course = await Course.create(req.body);
    res.status(201).json(course);
  } catch (err) {
    next(err);
  }
}

async function listCourses(req, res, next) {
  try {
    const courses = await Course.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    next(err);
  }
}

async function listBatches(req, res, next) {
  try {
    const batches = await Batch.find().populate('courseId', 'name').sort({ createdAt: -1 });
    res.json(batches);
  } catch (err) {
    next(err);
  }
}

module.exports = { createCourse, listCourses, listBatches };
