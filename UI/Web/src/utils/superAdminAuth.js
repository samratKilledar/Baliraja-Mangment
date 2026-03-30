const SUPER_ADMIN_EMAIL = 'superadmin@cognitix.tech';
const SUPER_ADMIN_RECOVERY_EMAIL = 'hrinfocognitix@gmail.com';
const SUPER_ADMIN_DEFAULT_PASSWORD = '123456';

const PASSWORD_KEY = 'ims_super_admin_password';
const RESET_TOKEN_KEY = 'ims_super_admin_reset_token';

function now() {
  return Date.now();
}

function normalizeEmail(value = '') {
  return String(value || '').trim().toLowerCase();
}

function buildFakeJwt() {
  const payload = {
    sub: 'frontend-super-admin',
    role: 'super_admin',
    email: SUPER_ADMIN_EMAIL,
    iat: Math.floor(now() / 1000)
  };
  return `frontend.${btoa(JSON.stringify(payload))}.token`;
}

function randomToken(len = 40) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function randomNumericPassword(len = 6) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += Math.floor(Math.random() * 10);
  }
  return out;
}

export function ensureSuperAdminPassword() {
  const existing = localStorage.getItem(PASSWORD_KEY);
  if (!existing || existing.length < 6) {
    localStorage.setItem(PASSWORD_KEY, SUPER_ADMIN_DEFAULT_PASSWORD);
    return SUPER_ADMIN_DEFAULT_PASSWORD;
  }
  return existing;
}

export function isSuperAdminIdentifier(identifier) {
  return normalizeEmail(identifier) === SUPER_ADMIN_EMAIL;
}

export function authenticateSuperAdmin(identifier, password) {
  if (!isSuperAdminIdentifier(identifier)) {
    return { ok: false, message: 'Use superadmin@cognitix.tech for super admin login.' };
  }

  const savedPassword = ensureSuperAdminPassword();
  if (String(password || '') !== savedPassword) {
    return { ok: false, message: 'Invalid super admin password.' };
  }

  return {
    ok: true,
    token: buildFakeJwt(),
    user: {
      id: 'frontend-super-admin',
      fullName: 'Super Admin',
      email: SUPER_ADMIN_EMAIL,
      role: 'super_admin',
      mustChangePassword: false,
      lastLoginAt: new Date().toISOString()
    }
  };
}

export function createSuperAdminResetLink() {
  const token = randomToken(48);
  const expiresAt = now() + 15 * 60 * 1000;

  localStorage.setItem(
    RESET_TOKEN_KEY,
    JSON.stringify({
      token,
      expiresAt,
      sentTo: SUPER_ADMIN_RECOVERY_EMAIL,
      createdAt: now()
    })
  );

  return {
    token,
    expiresAt,
    sentTo: SUPER_ADMIN_RECOVERY_EMAIL,
    link: `/super-admin/reset-password?token=${encodeURIComponent(token)}`
  };
}

export function resetSuperAdminPasswordByToken(token) {
  const raw = localStorage.getItem(RESET_TOKEN_KEY);
  if (!raw) {
    return { ok: false, message: 'Reset link not found. Please request a new link.' };
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    localStorage.removeItem(RESET_TOKEN_KEY);
    return { ok: false, message: 'Invalid reset link. Please request a new link.' };
  }

  if (!parsed?.token || parsed.token !== token) {
    return { ok: false, message: 'Invalid reset token.' };
  }

  if (!parsed?.expiresAt || parsed.expiresAt < now()) {
    localStorage.removeItem(RESET_TOKEN_KEY);
    return { ok: false, message: 'Reset link expired. Please request a new one.' };
  }

  localStorage.setItem(PASSWORD_KEY, SUPER_ADMIN_DEFAULT_PASSWORD);
  localStorage.removeItem(RESET_TOKEN_KEY);

  return {
    ok: true,
    message: `Password reset successful. Default password is ${SUPER_ADMIN_DEFAULT_PASSWORD}.`
  };
}

export function updateSuperAdminPassword(currentPassword, newPassword) {
  const savedPassword = ensureSuperAdminPassword();
  if (String(currentPassword || '') !== savedPassword) {
    return { ok: false, message: 'Current password is incorrect.' };
  }

  if (String(newPassword || '').length < 6) {
    return { ok: false, message: 'New password must be at least 6 characters.' };
  }

  localStorage.setItem(PASSWORD_KEY, String(newPassword));
  return { ok: true, message: 'Password updated successfully.' };
}

export function issueRandomSuperAdminPassword() {
  const nextPassword = randomNumericPassword(6);
  localStorage.setItem(PASSWORD_KEY, nextPassword);
  return {
    ok: true,
    password: nextPassword,
    sentTo: SUPER_ADMIN_RECOVERY_EMAIL,
    message: `Random password generated and sent to ${SUPER_ADMIN_RECOVERY_EMAIL}.`
  };
}

export {
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_RECOVERY_EMAIL,
  SUPER_ADMIN_DEFAULT_PASSWORD
};
