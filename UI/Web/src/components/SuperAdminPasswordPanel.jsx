import { useMemo, useState } from 'react';
import {
  SUPER_ADMIN_DEFAULT_PASSWORD,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_RECOVERY_EMAIL,
  createSuperAdminResetLink,
  issueRandomSuperAdminPassword,
  updateSuperAdminPassword
} from '../utils/superAdminAuth';

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export default function SuperAdminPasswordPanel() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');

  const canSubmit = useMemo(
    () => form.currentPassword.length >= 6 && form.newPassword.length >= 6 && form.confirmPassword.length >= 6,
    [form.currentPassword, form.newPassword, form.confirmPassword]
  );

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function clearStatus() {
    setError('');
    setMessage('');
  }

  function onChangePassword(event) {
    event.preventDefault();
    clearStatus();
    setResetLink('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Fill all password fields.');
      return;
    }

    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    const result = updateSuperAdminPassword(form.currentPassword, form.newPassword);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessage(result.message);
    setForm(initialForm);
  }

  function onSendResetLink() {
    clearStatus();
    const created = createSuperAdminResetLink();
    setResetLink(created.link);
    setMessage(`Reset link sent to ${created.sentTo}. Open the link to reset password to ${SUPER_ADMIN_DEFAULT_PASSWORD}.`);
  }

  function onGenerateRandomPassword() {
    clearStatus();
    setResetLink('');
    const generated = issueRandomSuperAdminPassword();
    setMessage(`${generated.message} Password: ${generated.password}`);
  }

  return (
    <div>
      <div className="snapshot-box" style={{ marginBottom: 14 }}>
        <div><small>Super Admin Login</small><strong>{SUPER_ADMIN_EMAIL}</strong></div>
        <div><small>Recovery Email</small><strong>{SUPER_ADMIN_RECOVERY_EMAIL}</strong></div>
        <div><small>Default Password</small><strong>{SUPER_ADMIN_DEFAULT_PASSWORD}</strong></div>
      </div>

      <form className="student-form" onSubmit={onChangePassword}>
        <div className="form-grid">
          <label>
            <span>Current Password</span>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setField('currentPassword', e.target.value)}
            />
          </label>
          <label>
            <span>New Password</span>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setField('newPassword', e.target.value)}
            />
          </label>
          <label>
            <span>Confirm New Password</span>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setField('confirmPassword', e.target.value)}
            />
          </label>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {!error && message ? <p style={{ color: '#15803d', marginTop: 10 }}>{message}</p> : null}
        {resetLink ? (
          <p style={{ color: '#1d4ed8', marginTop: 10, wordBreak: 'break-all' }}>
            Reset Link: <a href={resetLink}>{resetLink}</a>
          </p>
        ) : null}

        <div className="form-submit" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" className="primary-btn" disabled={!canSubmit}>
            Change Password
          </button>
          <button type="button" className="ghost-btn" onClick={onSendResetLink}>
            Send Reset Link
          </button>
          <button type="button" className="ghost-btn" onClick={onGenerateRandomPassword}>
            Generate Random Password
          </button>
        </div>
      </form>
    </div>
  );
}
