const Notification = require('./notification.model');
const DeviceToken = require('./deviceToken.model');
const Student = require('../students/student.model');
const Fee = require('../fees/fee.model');
const { sendPush } = require('../../utils/push.service');

async function createNotification(req, res, next) {
  try {
    const payload = { ...req.body, createdBy: req.user.sub };
    const notification = await Notification.create(payload);

    if (payload.channel === 'push') {
      const tokenFilter = {};
      if (payload.targetRoles?.length) tokenFilter.app = { $in: payload.targetRoles };
      if (payload.targetUserIds?.length) tokenFilter.userId = { $in: payload.targetUserIds };

      const tokens = await DeviceToken.find(tokenFilter).select('token');
      const tokenList = tokens.map((t) => t.token);
      if (tokenList.length) {
        await sendPush(tokenList, payload.title, payload.body, payload.data || {});
      }
    }

    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
}

async function listMyNotifications(req, res, next) {
  try {
    const data = await Notification.find({
      $or: [{ targetRoles: req.user.role }, { targetUserIds: req.user.sub }]
    }).sort({ createdAt: -1 });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function sendFeeReminder(req, res, next) {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const fee = await Fee.findOne({ studentId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'fullName phone' }
    });
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    const student = await Student.findById(studentId).populate('userId', 'fullName phone');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const userIds = [student.userId?._id].filter(Boolean);
    if (!userIds.length) return res.status(400).json({ message: 'Student has no linked user' });

    const tokens = await DeviceToken.find({ userId: { $in: userIds } }).select('token');
    const tokenList = tokens.map((t) => t.token);

    const due = fee.dueAmount ?? Math.max((fee.totalAmount || 0) - (fee.paidAmount || 0), 0);
    const title = 'Fee Due Reminder';
    const body = `Dear ${student.userId.fullName || 'Student'}, your due amount is ₹${due}. Please clear it at the earliest.`;

    if (!tokenList.length) {
      return res.status(200).json({ message: 'No FCM token found for this student', sent: false, due });
    }

    const pushRes = await sendPush(tokenList, title, body, { type: 'fee_due', studentId, due });
    res.json({ sent: true, tokens: tokenList.length, due, pushRes });
  } catch (err) {
    next(err);
  }
}

module.exports = { createNotification, listMyNotifications, sendFeeReminder };
