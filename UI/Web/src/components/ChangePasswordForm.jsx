import { useState } from 'react';
import api from '../api/client';

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export default function ChangePasswordForm() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');

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

    try {
      setSaving(true);
      await api.put('/users/me/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setMessage('Password updated successfully.');
      setForm(initialForm);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="student-form" onSubmit={onSubmit}>
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
      <div className="form-submit">
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Updating...' : 'Change Password'}
        </button>
      </div>
    </form>
  );
}
