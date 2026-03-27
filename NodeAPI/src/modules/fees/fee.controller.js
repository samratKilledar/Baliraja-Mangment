const Fee = require('./fee.model');
const Student = require('../students/student.model');
const { ROLES } = require('../../utils/constants');
const { normalizePagination, buildPaginationMeta } = require('../../utils/pagination');

async function recalcFee(fee) {
  if (!fee) return fee;
  const txPaid = (fee.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const paid = txPaid > 0 ? txPaid : (Number(fee.paidAmount) || 0);
  fee.paidAmount = paid;
  fee.dueAmount = Math.max(0, (fee.totalAmount || 0) - paid);
  fee.paymentStatus = fee.dueAmount === 0 ? 'paid' : fee.paidAmount > 0 ? 'partial' : 'pending';
  await fee.save();
  return fee;
}

async function createFeeRecord(req, res, next) {
  try {
    const fee = await Fee.create(req.body);
    res.status(201).json(fee);
  } catch (err) {
    next(err);
  }
}

async function addPayment(req, res, next) {
  try {
    const { feeId } = req.params;
    const { amount, mode, transactionRef, note, paidOn } = req.body;
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const paidOnDate = paidOn ? new Date(paidOn) : new Date();
    if (Number.isNaN(paidOnDate.getTime())) return res.status(400).json({ message: 'Invalid payment date' });

    const fee = await Fee.findById(feeId);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });
    if (fee.totalAmount < (fee.paidAmount || 0) + amountNum) {
      return res.status(400).json({ message: 'Payment exceeds total fee amount' });
    }

    const student = await Student.findById(fee.studentId).populate('userId', 'phone email fullName');

    fee.transactions.push({
      amount: amountNum,
      mode,
      transactionRef,
      note,
      paidOn: paidOnDate,
      receivedBy: req.user.sub,
      studentPhone: student?.userId?.phone,
      studentEnrollment: student?.enrollmentNo
    });

    fee.paidAmount += amountNum;
    fee.dueAmount = Math.max(0, fee.totalAmount - fee.paidAmount);
    fee.paymentStatus = fee.dueAmount === 0 ? 'paid' : fee.paidAmount > 0 ? 'partial' : 'pending';

    await fee.save();
    const updated = await recalcFee(fee); // normalize totals from transactions
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

async function updateFeeRecord(req, res, next) {
  try {
    const { feeId } = req.params;
    const payload = req.body;
    const fee = await Fee.findById(feeId);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    const isSuperAdmin = req.user?.role === ROLES.SUPER_ADMIN;
    const isAdmin = req.user?.role === ROLES.ADMIN;
    if (!isSuperAdmin && !isAdmin) {
      return res.status(403).json({ message: 'Only admins and super admins can edit fee records' });
    }
    if (!payload.reason) return res.status(400).json({ message: 'Reason is required for fee updates' });

    if (!isSuperAdmin) {
      const attemptedRestrictedFields = ['paidAmount', 'transactions'].filter(
        (field) => payload[field] !== undefined
      );
      if (attemptedRestrictedFields.length) {
        return res.status(403).json({ message: 'Admins can update fee amount and dates, but not paid amount or payment history' });
      }
    }

    const txPaid = (fee.transactions || []).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const currentPaid = txPaid > 0 ? txPaid : (fee.paidAmount || 0);

    const beforeSnapshot = {
      totalAmount: fee.totalAmount,
      paidAmount: fee.paidAmount,
      dueAmount: fee.dueAmount,
      feeStartDate: fee.feeStartDate,
      feeEndDate: fee.feeEndDate,
      dueDate: fee.dueDate
    };

    if (payload.totalAmount !== undefined && (isSuperAdmin || isAdmin)) {
      if (payload.totalAmount < currentPaid) {
        return res.status(400).json({ message: 'Total fee cannot be less than already paid amount' });
      }
      fee.totalAmount = payload.totalAmount;
    }
    if (payload.paidAmount !== undefined && isSuperAdmin) fee.paidAmount = payload.paidAmount;
    if (payload.dueDate !== undefined && (isSuperAdmin || isAdmin)) fee.dueDate = payload.dueDate;
    if (payload.feeStartDate !== undefined) fee.feeStartDate = payload.feeStartDate;
    if (payload.feeEndDate !== undefined) fee.feeEndDate = payload.feeEndDate;
    if (payload.transactions?.length && isSuperAdmin) fee.transactions = payload.transactions;

    fee.dueAmount = Math.max(0, fee.totalAmount - fee.paidAmount);
    fee.paymentStatus = fee.dueAmount === 0 ? 'paid' : fee.paidAmount > 0 ? 'partial' : 'pending';

    fee.updateHistory.push({
      changedBy: req.user.sub,
      reason: payload.reason,
      before: beforeSnapshot,
      after: {
        totalAmount: fee.totalAmount,
        paidAmount: fee.paidAmount,
        dueAmount: fee.dueAmount,
        feeStartDate: fee.feeStartDate,
        feeEndDate: fee.feeEndDate,
        dueDate: fee.dueDate
      },
      changedAt: new Date()
    });

    await fee.save();
    res.json(fee);
  } catch (err) {
    next(err);
  }
}

async function feeSummary(req, res, next) {
  try {
    const stats = await Fee.aggregate([
      {
        $group: {
          _id: null,
          totalExpected: { $sum: '$totalAmount' },
          totalCollected: { $sum: '$paidAmount' },
          totalDue: { $sum: '$dueAmount' }
        }
      }
    ]);

    res.json(stats[0] || { totalExpected: 0, totalCollected: 0, totalDue: 0 });
  } catch (err) {
    next(err);
  }
}

async function listFees(req, res, next) {
  try {
    const { page, limit, skip } = normalizePagination(req.query, 10, 100);
    const [total, fees] = await Promise.all([
      Fee.countDocuments(),
      Fee.find()
      .populate('studentId', 'enrollmentNo userId batchId')
      .populate({ path: 'studentId', populate: [{ path: 'userId', select: 'fullName phone email' }, { path: 'batchId', select: 'batchName' }] })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
    ]);
    const normalized = await Promise.all(fees.map((f)=>recalcFee(f)));
    res.json({
      items: normalized.map((f)=>f.toObject()),
      meta: buildPaginationMeta({ total, page, limit })
    });
  } catch (err) {
    next(err);
  }
}

async function deleteFeeRecord(req, res, next) {
  try {
    const { feeId } = req.params;
    const fee = await Fee.findById(feeId);
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });

    if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Only admins and super admins can delete fee records' });
    }

    await Fee.findByIdAndDelete(feeId);
    res.json({ message: 'Fee record deleted' });
  } catch (err) {
    next(err);
  }
}

async function pendingFees(req, res, next) {
  try {
    const today = new Date();
    const sixtyDaysAgo = new Date(today);
    sixtyDaysAgo.setDate(today.getDate() - 60);

    const records = await Fee.find({ dueAmount: { $gt: 0 } })
      .populate('studentId', 'enrollmentNo')
      .populate('studentId')
      .populate({ path: 'studentId', populate: { path: 'userId', select: 'fullName phone email' } });

    const withFlags = records.map((f) => {
      const lastPayment = f.transactions?.slice(-1)?.[0]?.paidOn || f.createdAt;
      const severe = new Date(lastPayment) < sixtyDaysAgo;
      return { ...f.toObject(), isSeverelyOverdue: severe };
    });

    res.json(withFlags);
  } catch (err) {
    next(err);
  }
}

async function getFeeByStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const fee = await Fee.findOne({ studentId }).populate({ path: 'studentId', populate: { path: 'userId', select: 'fullName phone email' } });
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });
    await recalcFee(fee);
    if (['student', 'parent'].includes(req.user.role)) {
      const student = await Student.findById(studentId);
      if (!student) return res.status(404).json({ message: 'Student not found' });
      const isStudent = req.user.role === 'student' && student.userId?.toString() === req.user.sub;
      const isParent = req.user.role === 'parent' && student.guardianUserId?.toString() === req.user.sub;
      if (!isStudent && !isParent) return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(fee);
  } catch (err) {
    next(err);
  }
}

async function myFee(req, res, next) {
  try {
    const userId = req.user.sub;
    let student = await Student.findOne({ userId });
    if (!student) student = await Student.findOne({ guardianUserId: userId });
    if (!student) return res.status(404).json({ message: 'Student not mapped to this account' });
    const fee = await Fee.findOne({ studentId: student._id });
    if (!fee) return res.status(404).json({ message: 'Fee record not found' });
    await recalcFee(fee);
    res.json(fee.toObject());
  } catch (err) {
    next(err);
  }
}

async function collectionByRange(req, res, next) {
  try {
    const { range = 'month' } = req.query;
    const now = new Date();
    let start = new Date(0);
    if (range === 'week') {
      start = new Date(now);
      start.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      start = new Date(now.getFullYear(), 0, 1);
    }

    const stats = await Fee.aggregate([
      { $unwind: '$transactions' },
      { $match: { 'transactions.paidOn': { $gte: start } } },
      {
        $group: {
          _id: null,
          collected: { $sum: '$transactions.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json(stats[0] || { collected: 0, count: 0, range });
  } catch (err) {
    next(err);
  }
}

function getFeeCategory(student = {}) {
  const education = student?.details?.education || {};
  const currentClass = education.currentClass || '';
  const purposes = Array.isArray(education.admissionPurposes) ? education.admissionPurposes : [];
  const normalizedPurposes = purposes.map((item) => String(item || '').toLowerCase());

  if (currentClass === '11th Std' || normalizedPurposes.some((item) => item.includes('11th'))) return '11th';
  if (currentClass === '12th Std' || normalizedPurposes.some((item) => item.includes('12th'))) return '12th';
  if (normalizedPurposes.some((item) => item.includes('army') || item.includes('aramy'))) return 'Army Preparation';
  if (normalizedPurposes.some((item) => item.includes('police'))) return 'Police Preparation';
  if (normalizedPurposes.some((item) => item.includes('recruitment'))) return 'Recruitment Preparation';
  return education.admissionType || 'Other';
}

async function feeCategorySummary(req, res, next) {
  try {
    const fees = await Fee.find()
      .populate({
        path: 'studentId',
        select: 'details enrollmentNo',
        populate: { path: 'userId', select: 'fullName phone email' }
      })
      .sort({ createdAt: -1 });

    const summary = fees.reduce((acc, fee) => {
      const category = getFeeCategory(fee.studentId || {});
      if (!acc[category]) {
        acc[category] = {
          category,
          studentCount: 0,
          totalExpected: 0,
          totalCollected: 0,
          totalDue: 0
        };
      }
      acc[category].studentCount += 1;
      acc[category].totalExpected += Number(fee.totalAmount) || 0;
      acc[category].totalCollected += Number(fee.paidAmount) || 0;
      acc[category].totalDue += Number(fee.dueAmount) || 0;
      return acc;
    }, {});

    res.json({ items: Object.values(summary) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createFeeRecord,
  addPayment,
  updateFeeRecord,
  feeSummary,
  pendingFees,
  getFeeByStudent,
  myFee,
  collectionByRange,
  feeCategorySummary,
  listFees,
  deleteFeeRecord
};
