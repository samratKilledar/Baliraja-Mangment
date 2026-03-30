const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../users/user.model');
const { registerSchema, loginSchema, forgotSuperAdminPasswordSchema } = require('./auth.validation');
const { ROLES } = require('../../utils/constants');
const { encryptPassword } = require('../../utils/passwordVault');

let cachedTransporter = null;

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
}

function getMailerConfig() {
  const user = process.env.RESET_EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.RESET_EMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0) || undefined;
  const smtpNoAuth = String(process.env.SMTP_NO_AUTH || '').toLowerCase() === 'true';
  const from = process.env.RESET_EMAIL_FROM || user || process.env.SUPER_ADMIN_EMAIL || 'no-reply@localhost';

  if (host && user && pass) {
    return {
      host,
      port: port || 587,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: { user, pass },
      from
    };
  }

  if (host && smtpNoAuth) {
    return {
      host,
      port: port || 25,
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      noAuth: true,
      from
    };
  }

  if (user && pass) {
    return {
      service: 'gmail',
      auth: { user, pass },
      from
    };
  }

  return null;
}

function getMailerTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const config = getMailerConfig();
  if (!config) return null;
  const transport = nodemailer.createTransport(
    config.service
      ? { service: config.service, auth: config.auth }
      : {
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: config.noAuth ? undefined : config.auth
        }
  );
  cachedTransporter = { transport, from: config.from };
  return cachedTransporter;
}

function generateNumericPassword(length = 6) {
  let next = '';
  for (let i = 0; i < length; i += 1) {
    next += String(Math.floor(Math.random() * 10));
  }
  return next;
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

    if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role)) {
      user.lastLoginAt = new Date();
      await user.save();
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
        lastLoginAt: user.lastLoginAt || null,
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

async function forgotSuperAdminPassword(req, res, next) {
  try {
    const payload = forgotSuperAdminPasswordSchema.parse(req.body || {});
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@cognitix.tech').toLowerCase();
    const recoveryEmail = (process.env.SUPER_ADMIN_RECOVERY_EMAIL || 'hrinfocognitix@gmail.com').toLowerCase();

    if (payload.email && payload.email.toLowerCase() !== superAdminEmail) {
      return res.status(400).json({ message: `Only ${superAdminEmail} is allowed for super admin recovery.` });
    }

    const user = await User.findOne({
      email: superAdminEmail,
      role: ROLES.SUPER_ADMIN
    });
    if (!user) {
      return res.status(404).json({ message: 'Super admin account not found.' });
    }

    const mailer = getMailerTransporter();
    if (!mailer) {
      return res.status(503).json({
        message:
          'Email service is not configured. Set RESET_EMAIL_USER and RESET_EMAIL_APP_PASSWORD, or SMTP_HOST with SMTP_USER/SMTP_PASS, or SMTP_HOST with SMTP_NO_AUTH=true.'
      });
    }

    const temporaryPassword = generateNumericPassword(6);
    user.passwordHash = await bcrypt.hash(temporaryPassword, 10);
    user.passwordCipher = encryptPassword(temporaryPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    const subject = 'Super Admin Password Reset';
    const text = [
      'Super admin password has been reset.',
      `Login email: ${superAdminEmail}`,
      `Temporary password: ${temporaryPassword}`,
      'Please login and change password immediately.'
    ].join('\n');

    try {
      await mailer.transport.sendMail({
        from: mailer.from,
        to: recoveryEmail,
        subject,
        text
      });
    } catch (mailErr) {
      console.error('Super admin reset email failed', {
        message: mailErr?.message,
        code: mailErr?.code,
        command: mailErr?.command,
        response: mailErr?.response
      });
      const payload = {
        message: 'Password reset generated, but email delivery failed. Please verify SMTP credentials and try again.'
      };
      if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
        payload.debug = {
          code: mailErr?.code || '',
          command: mailErr?.command || '',
          providerMessage: mailErr?.response || mailErr?.message || ''
        };
      }
      return res.status(502).json(payload);
    }

    const response = {
      message: `Reset password has been sent to ${recoveryEmail}.`
    };

    if ((process.env.NODE_ENV || '').toLowerCase() !== 'production') {
      response.tempPassword = temporaryPassword;
    }

    return res.json(response);
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, bootstrapSuperAdmin, forgotSuperAdminPassword };
