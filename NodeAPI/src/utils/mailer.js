const nodemailer = require('nodemailer');

let cachedTransporter = null;

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

module.exports = { getMailerTransporter };
