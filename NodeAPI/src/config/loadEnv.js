const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadIfExists(filePath) {
  if (!fs.existsSync(filePath)) return;
  dotenv.config({ path: filePath, override: false });
}

function loadEnv() {
  const rootDir = path.resolve(__dirname, '..', '..');
  const nodeEnv = process.env.NODE_ENV || 'development';

  loadIfExists(path.join(rootDir, '.env'));
  loadIfExists(path.join(rootDir, `.env.${nodeEnv}`));
  loadIfExists(path.join(rootDir, '.env.local'));
  loadIfExists(path.join(rootDir, `.env.${nodeEnv}.local`));
}

module.exports = { loadEnv };
