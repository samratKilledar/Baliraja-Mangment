const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');
const {
  createComplaint,
  listComplaints,
  updateComplaintStatus,
  myComplaints,
  deleteComplaint
} = require('./complaint.controller');

const router = express.Router();

// Optional auth for complaint submission from mobile; other routes stay protected
function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return next();
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (err) {
    // ignore invalid token; treat as unauthenticated
  }
  return next();
}

// Public/optional-auth endpoints (mobile)
router.post('/', optionalAuthenticate, createComplaint);
router.delete('/:complaintId', optionalAuthenticate, deleteComplaint);
router.get('/my', optionalAuthenticate, myComplaints);

// Protected routes (require JWT)
router.use(authenticate);
router.get('/', authorize(ROLES.ADMIN), listComplaints);
router.put('/:complaintId/status', authorize(ROLES.ADMIN), updateComplaintStatus);

module.exports = router;
