const crypto = require('crypto');

function getSecret() {
  const baseSecret = process.env.PASSWORD_VAULT_SECRET || process.env.JWT_SECRET;
  if (!baseSecret) {
    throw new Error('PASSWORD_VAULT_SECRET or JWT_SECRET must be configured');
  }

  return crypto.createHash('sha256').update(String(baseSecret)).digest();
}

function encryptPassword(plainText = '') {
  if (!plainText) return '';

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', getSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptPassword(cipherText = '') {
  if (!cipherText) return '';

  try {
    const [ivHex, encryptedHex] = String(cipherText).split(':');
    if (!ivHex || !encryptedHex) return '';

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      getSecret(),
      Buffer.from(ivHex, 'hex')
    );
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedHex, 'hex')),
      decipher.final()
    ]);
    return decrypted.toString('utf8');
  } catch (error) {
    return '';
  }
}

module.exports = { encryptPassword, decryptPassword };
