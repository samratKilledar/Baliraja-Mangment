import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  SUPER_ADMIN_DEFAULT_PASSWORD,
  SUPER_ADMIN_EMAIL,
  SUPER_ADMIN_RECOVERY_EMAIL,
  resetSuperAdminPasswordByToken
} from '../../utils/superAdminAuth';

export default function SuperAdminResetPage() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  function onResetClick() {
    setError('');
    setMessage('');

    if (!token) {
      setError('Reset token is missing. Please request a new reset link.');
      return;
    }

    const result = resetSuperAdminPasswordByToken(token);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    setDone(true);
    setMessage(result.message);
  }

  return (
    <div className="auth-shell">
      <div className="auth-card fade-up" style={{ maxWidth: 560 }}>
        <div className="auth-head">
          <p className="auth-kicker">Super Admin Recovery</p>
          <h2>Reset Password</h2>
          <p className="auth-subtitle">
            Login Email: <strong>{SUPER_ADMIN_EMAIL}</strong>
            <br />
            Recovery Email: <strong>{SUPER_ADMIN_RECOVERY_EMAIL}</strong>
          </p>
        </div>

        {error ? <p className="error">{error}</p> : null}
        {!error && message ? <p style={{ color: '#15803d' }}>{message}</p> : null}

        {!done ? (
          <button className="primary-btn" onClick={onResetClick}>
            Reset To Default ({SUPER_ADMIN_DEFAULT_PASSWORD})
          </button>
        ) : (
          <Link to="/login" className="primary-btn" style={{ display: 'inline-flex', textDecoration: 'none' }}>
            Back To Login
          </Link>
        )}
      </div>
    </div>
  );
}
