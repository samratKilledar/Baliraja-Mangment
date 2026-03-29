const express = require('express');
const { register, login, bootstrapSuperAdmin, forgotSuperAdminPassword } = require('./auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-super-admin-password', forgotSuperAdminPassword);
router.post('/bootstrap-super-admin', bootstrapSuperAdmin);

module.exports = router;
