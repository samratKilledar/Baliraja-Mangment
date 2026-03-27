const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../users/user.model');
const { registerSchema, loginSchema } = require('./auth.validation');
const { ROLES } = require('../../utils/constants');
const { encryptPassword } = require('../../utils/passwordVault');

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

async function register(req, res, next) {
  try {
    const payload = registerSchema.parse(req.body);

    const exists = await User.findOne({ email: payload.email });
    if (exists) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const user = await User.create({ ...payload, passwordHash, passwordCipher: encryptPassword(payload.password) });

    const token = signToken(user);
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword)
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const payload = loginSchema.parse(req.body);
    const identifier = payload.identifier || payload.email;

    const user = await User.findOne({
      $or: [{ email: identifier?.toLowerCase() }, { phone: identifier }]
    });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        mustChangePassword: Boolean(user.mustChangePassword)
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function bootstrapSuperAdmin(req, res, next) {
  try {
    if (!process.env.BOOTSTRAP_KEY || req.headers['x-bootstrap-key'] !== process.env.BOOTSTRAP_KEY) {
      return res.status(403).json({ message: 'Bootstrap key invalid' });
    }

    const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
    if (existing) return res.status(409).json({ message: 'Super admin already exists' });

    const { fullName, email, phone, password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      fullName,
      email,
      phone,
      role: ROLES.SUPER_ADMIN,
      passwordHash,
      passwordCipher: encryptPassword(password)
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, fullName, email, role: user.role, mustChangePassword: Boolean(user.mustChangePassword) }
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, bootstrapSuperAdmin };
