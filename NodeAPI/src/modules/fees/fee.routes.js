const express = require('express');
const {
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
} = require('./fee.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

router.use(authenticate);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createFeeRecord);
router.post('/:feeId/payments', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), addPayment);
router.put('/:feeId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateFeeRecord);
router.delete('/:feeId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteFeeRecord);
router.get('/summary', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), feeSummary);
router.get('/list', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listFees);
router.get('/category-summary', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), feeCategorySummary);
router.get('/pending', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER), pendingFees);
router.get('/student/:studentId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT), getFeeByStudent);
router.get('/my', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT), myFee);
router.get('/collection', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), collectionByRange);

module.exports = router;
