require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./config/db');
const { seedSuperAdmin } = require('./config/seedSuperAdmin');

const PORT = process.env.PORT || 4000;

function assertEnv() {
  const required = ['JWT_SECRET', 'MONGODB_URI', 'FCM_SERVER_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`Missing env vars: ${missing.join(', ')}`);
    process.exit(1);
  }
}

async function start() {
  assertEnv();
  await connectDB(process.env.MONGODB_URI);
  await seedSuperAdmin();
  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
}

start();
