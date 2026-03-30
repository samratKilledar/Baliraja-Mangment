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
    const { studentId, customMessage } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const fee = await Fee.findOne({ studentId }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'fullName phone' }
    });
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    const student = await Student.findById(studentId).populate('userId', 'fullName phone');
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const due = fee.dueAmount ?? Math.max((fee.totalAmount || 0) - (fee.paidAmount || 0), 0);
    if (due <= 0) {
      return res.status(400).json({ message: 'Student has no pending fee due.' });
    }
    const feeEndDate = fee.feeEndDate ? new Date(fee.feeEndDate) : null;
    const daysLeft = feeEndDate
      ? Math.ceil((new Date(feeEndDate).setHours(0, 0, 0, 0) - new Date(new Date().setHours(0, 0, 0, 0))) / (1000 * 60 * 60 * 24))
      : null;

    const latestToken = await DeviceToken.findOne({
      userId: student.userId?._id,
      app: 'student'
    })
      .sort({ lastSeen: -1 })
      .select('token deviceUuid lastSeen')
      .lean();

    if (!latestToken?.deviceUuid) {
      return res.status(200).json({
        message: 'Student UUID not found. Notification not sent.',
        sent: false,
        due,
        uuidPresent: false
      });
    }

    const title = 'Fee Due Reminder';
    const body = customMessage?.trim()
      ? customMessage.trim()
      : `Dear ${student.userId.fullName || 'Student'}, your due amount is ₹${due}. Please clear it at the earliest.`;

    if (!latestToken?.token) {
      return res.status(200).json({
        message: 'No FCM token found for this student',
        sent: false,
        due,
        uuidPresent: true,
        uuid: latestToken.deviceUuid
      });
    }

    const pushRes = await sendPush([latestToken.token], title, body, {
      type: 'fee_due',
      studentId,
      due,
      daysLeft
    });
    res.json({
      sent: true,
      tokens: 1,
      due,
      daysLeft,
      uuidPresent: true,
      uuid: latestToken.deviceUuid,
      pushRes
    });
  } catch (err) {
    next(err);
  }
}

async function sendPendingFeeNearEndReminders(req, res, next) {
  try {
    const { customMessage } = req.body || {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fees = await Fee.find({
      dueAmount: { $gt: 0 },
      feeEndDate: { $exists: true, $ne: null }
    })
      .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'fullName phone' }
      })
      .lean();

    const eligible = fees.filter((fee) => {
      const end = fee.feeEndDate ? new Date(fee.feeEndDate) : null;
      if (!end || Number.isNaN(end.getTime())) return false;
      end.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysLeft >= 0 && daysLeft <= 30 && (Number(fee.dueAmount) || 0) > 0;
    });

    const studentUserIds = eligible
      .map((fee) => fee?.studentId?.userId?._id)
      .filter(Boolean)
      .map((id) => String(id));

    const tokenRows = studentUserIds.length
      ? await DeviceToken.find({ userId: { $in: studentUserIds }, app: 'student' })
          .sort({ lastSeen: -1 })
          .select('userId token deviceUuid')
          .lean()
      : [];
    const tokenMap = tokenRows.reduce((acc, row) => {
      const key = String(row.userId);
      if (!acc[key]) acc[key] = row;
      return acc;
    }, {});

    let sentCount = 0;
    let skippedNoUuid = 0;
    let skippedNoToken = 0;
    const attempted = [];

    for (const fee of eligible) {
      const userId = fee?.studentId?.userId?._id ? String(fee.studentId.userId._id) : '';
      const tokenRow = tokenMap[userId];
      const end = fee.feeEndDate ? new Date(fee.feeEndDate) : null;
      const daysLeft = end ? Math.ceil((new Date(end).setHours(0, 0, 0, 0) - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

      if (!tokenRow?.deviceUuid) {
        skippedNoUuid += 1;
        attempted.push({ studentId: fee.studentId?._id, sent: false, reason: 'uuid_missing' });
        continue;
      }
      if (!tokenRow?.token) {
        skippedNoToken += 1;
        attempted.push({ studentId: fee.studentId?._id, sent: false, reason: 'token_missing', uuid: tokenRow.deviceUuid });
        continue;
      }

      const due = Number(fee.dueAmount) || 0;
      const title = 'Fee Pending Reminder';
      const body = customMessage?.trim()
        ? customMessage.trim()
        : `Your fee payment is pending (₹${due}). Fee end date is within ${daysLeft} day(s). Please submit your fees.`;

      // eslint-disable-next-line no-await-in-loop
      await sendPush([tokenRow.token], title, body, {
        type: 'fee_due_near_end',
        studentId: String(fee.studentId?._id || ''),
        due,
        daysLeft
      });
      sentCount += 1;
      attempted.push({ studentId: fee.studentId?._id, sent: true, uuid: tokenRow.deviceUuid, due, daysLeft });
    }

    return res.json({
      message: 'Daily pending-fee reminder execution completed.',
      totalFeesChecked: fees.length,
      eligibleCount: eligible.length,
      sentCount,
      skippedNoUuid,
      skippedNoToken,
      attempted
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createNotification,
  listMyNotifications,
  sendFeeReminder,
  sendPendingFeeNearEndReminders
};
