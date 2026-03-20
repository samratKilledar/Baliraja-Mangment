const Notification = require('./notification.model');
const DeviceToken = require('./deviceToken.model');
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

module.exports = { createNotification, listMyNotifications };
