const bcrypt = require('bcryptjs');
const Worker = require('./worker.model');
const User = require('../users/user.model');
const { ROLES } = require('../../utils/constants');

async function createWorker(req, res, next) {
  try {
    const payload = req.body;
    const passwordHash = await bcrypt.hash(payload.password || '123456', 10);
    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      role: ROLES.WORKER,
      passwordHash
    });

    const worker = await Worker.create({
      userId: user._id,
      roleTitle: payload.roleTitle || 'worker',
      contractStart: payload.contractStart,
      contractEnd: payload.contractEnd,
      totalContractAmount: payload.totalContractAmount || 0
    });

    res.status(201).json({ user, worker });
  } catch (err) {
    next(err);
  }
}

async function listWorkers(req, res, next) {
  try {
    const workers = await Worker.find().populate('userId', 'fullName email phone');
    const mapped = workers.map((w) => {
      const obj = w.toObject();
      obj.remainingAmount = obj.totalContractAmount - (obj.paidAmount || 0);
      return obj;
    });
    res.json(mapped);
  } catch (err) {
    next(err);
  }
}

async function updateWorker(req, res, next) {
  try {
    const { workerId } = req.params;
    const payload = req.body;
    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    if (payload.fullName || payload.email || payload.phone) {
      const user = await User.findById(worker.userId);
      if (user) {
        if (payload.fullName) user.fullName = payload.fullName;
        if (payload.email) user.email = payload.email;
        if (payload.phone) user.phone = payload.phone;
        await user.save();
      }
    }

    const updatable = ['contractStart', 'contractEnd', 'totalContractAmount', 'roleTitle'];
    updatable.forEach((k) => {
      if (payload[k] !== undefined) worker[k] = payload[k];
    });

    await worker.save();
    const refreshed = await Worker.findById(workerId).populate('userId', 'fullName email phone');
    res.json(refreshed);
  } catch (err) {
    next(err);
  }
}

async function addWorkerPayment(req, res, next) {
  try {
    const { workerId } = req.params;
    const { amount, note } = req.body;
    const worker = await Worker.findById(workerId);
    if (!worker) return res.status(404).json({ message: 'Worker not found' });

    worker.payments.push({ amount, note, receivedBy: req.user.sub });
    worker.paidAmount += amount;
    await worker.save();

    res.json(worker);
  } catch (err) {
    next(err);
  }
}

module.exports = { listWorkers, updateWorker, addWorkerPayment, createWorker };
