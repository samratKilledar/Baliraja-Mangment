const express = require('express');
const {
  getMe,
  createUser,
  listUsers,
  deleteUser,
  updateMyPassword,
  publicUserByPhone
} = require('./user.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../utils/constants');

const router = express.Router();

// Public lookup by phone (all roles, minimal fields)
router.get('/public/by-phone/:phone', publicUserByPhone);

// Protect all routes after this
router.use(authenticate);

router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), createUser);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), listUsers);
router.put('/me/password', updateMyPassword);
// GET logged-in user
router.get('/me', getMe);
router.delete('/:userId', authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), deleteUser);

module.exports = router;
