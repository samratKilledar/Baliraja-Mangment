const express = require('express');
const DeviceToken = require('./deviceToken.model');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', async (req, res, next) => {
  try {
    const { token, platform = 'android', app = 'student' } = req.body;
    if (!token) return res.status(400).json({ message: 'token required' });

    const saved = await DeviceToken.findOneAndUpdate(
      { token },
      { userId: req.user.sub, platform, app, lastSeen: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(saved);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
