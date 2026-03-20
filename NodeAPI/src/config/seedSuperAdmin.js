const bcrypt = require('bcryptjs');
const User = require('../modules/users/user.model');
const { ROLES } = require('../utils/constants');

/**
 * Ensures a super admin account exists.
 * Environment overrides:
 *   SUPER_ADMIN_EMAIL (default: superadmin@baliraja.com)
 *   SUPER_ADMIN_PASSWORD (default: 123456)
 *   SUPER_ADMIN_PHONE (optional)
 *   SUPER_ADMIN_FORCE_RESET=true  -> reset password on each boot
 */
async function seedSuperAdmin() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@baliraja.com').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || '123456';
  const phone = process.env.SUPER_ADMIN_PHONE || '9999999999';
  const forceReset = String(process.env.SUPER_ADMIN_FORCE_RESET || '').toLowerCase() === 'true';

  let user = await User.findOne({ email });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await User.create({
      fullName: 'Super Admin',
      email,
      phone,
      role: ROLES.SUPER_ADMIN,
      passwordHash
    });
    console.log(`Seeded super admin ${email}`);
    return;
  }

  // Update phone if missing or different
  let changed = false;
  if (!user.phone || user.phone !== phone) {
    user.phone = phone;
    changed = true;
  }

  // Optionally reset password each boot
  if (forceReset) {
    user.passwordHash = await bcrypt.hash(password, 10);
    changed = true;
    console.log(`Super admin ${email} password reset from env.`);
  }

  if (changed) {
    await user.save();
    console.log(`Super admin ${email} updated (phone/password).`);
  }
}

module.exports = { seedSuperAdmin };
