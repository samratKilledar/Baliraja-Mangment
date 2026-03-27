import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VectorIcon from '../../components/VectorIcon';
import api from '../../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState(import.meta.env.VITE_SUPER_EMAIL || 'superadmin@baliraja.com');
  const [password, setPassword] = useState(import.meta.env.VITE_SUPER_PASSWORD || '123456');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const reason = localStorage.getItem('ims_logout_reason');
    if (reason === 'expired') {
      setNotice('Your session expired. Please sign in again.');
    }
    localStorage.removeItem('ims_logout_reason');
  }, []);

  const canSubmit = useMemo(
    () => email.trim().length > 4 && password.length >= 4,
    [email, password]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Enter valid email and password to continue.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/auth/login', {
        identifier: email,
        password
      });

      // persist token + user to context/localStorage
      login({
        token: data.token,
        user: data.user
      });
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Please check credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-bg auth-bg-one" />
      <div className="auth-bg auth-bg-two" />

      <form className="auth-card fade-up shadow-lg border-0" onSubmit={onSubmit}>
        <div className="auth-head">
          <div className="auth-logo">
            <VectorIcon name="shield" size={32} animated />
          </div>
          <div>
            <h1 className="brand-heading">Baliraja Academy</h1>
            <p className="auth-subtitle">Management Portal</p>
          </div>
        </div>

        <p className="auth-subtitle border-start border-4 ps-3 mt-3">
          Static Login – Super Admin Dashboard Access
        </p>

        <label className="field">
          <span><VectorIcon name="mail" size={16} /> Email</span>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="field">
          <span><VectorIcon name="lock" size={16} /> Password</span>
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error ? <p className="error">{error}</p> : null}
        {!error && notice ? <p style={{ color: '#1e8e3e', marginTop: 8 }}>{notice}</p> : null}

        <button className="primary-btn btn btn-primary btn-lg w-100" type="submit" disabled={!canSubmit || loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
