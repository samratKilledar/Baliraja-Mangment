const express = require('express');
const { register, login, bootstrapSuperAdmin } = require('./auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/bootstrap-super-admin', bootstrapSuperAdmin);

module.exports = router;
