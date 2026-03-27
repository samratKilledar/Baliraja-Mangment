const bcrypt = require('bcryptjs');
const { loadEnv } = require('../config/loadEnv');

loadEnv();

const { connectDB } = require('../config/db');
const User = require('../modules/users/user.model');
const { ROLES } = require('../utils/constants');
const { encryptPassword } = require('../utils/passwordVault');

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || 'superadmin@baliraja.com').toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD || '123456';
  const phone = process.env.SUPER_ADMIN_PHONE || '9999999999';

  await connectDB(process.env.MONGODB_URI);

  const passwordHash = await bcrypt.hash(password, 10);
  const update = {
    fullName: 'Super Admin',
    email,
    phone,
    role: ROLES.SUPER_ADMIN,
    passwordHash,
    passwordCipher: encryptPassword(password)
  };

  const user = await User.findOneAndUpdate(
    { email },
    update,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Local super admin ready: ${user.email}`);
  console.log(`Password set from env: ${password}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(`Failed to reset local super admin: ${error.message}`);
  process.exit(1);
});
