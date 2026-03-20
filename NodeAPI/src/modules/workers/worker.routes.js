const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const { listWorkers, updateWorker, addWorkerPayment, createWorker } = require('./worker.controller');

const router = express.Router();

router.use(authenticate);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listWorkers);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createWorker);
router.put('/:workerId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), updateWorker);
router.post('/:workerId/payments', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), addWorkerPayment);

module.exports = router;
