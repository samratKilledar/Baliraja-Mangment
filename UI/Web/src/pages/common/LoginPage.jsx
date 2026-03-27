import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VectorIcon from '../../components/VectorIcon';
import api from '../../api/client';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(import.meta.env.VITE_SUPER_EMAIL || 'superadmin@baliraja.com');
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
    () => identifier.trim().length >= 3 && password.length >= 6,
    [identifier, password]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setError('');

    if (!canSubmit) {
      setError('Enter valid mobile/email and password to continue.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password
      });

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
      <div className="login-demo-frame fade-up">
        <div className="login-demo-card">
          <section className="login-illustration-pane">
            <div className="login-illustration-art">
              <div className="login-art-monitor" />
              <div className="login-art-person">
                <div className="login-art-head" />
                <div className="login-art-body" />
              </div>
              <div className="login-art-desk" />
            </div>
            <div className="login-illustration-copy">
              <h1 className="brand-heading">Baliraja Academy</h1>
              <p className="auth-subtitle">Management Portal</p>
            </div>
          </section>

          <form className="login-form-pane" onSubmit={onSubmit}>
            <div className="login-form-head">
              <VectorIcon name="shield" size={18} />
              <strong>Login</strong>
            </div>

            <label className="field">
              <span><VectorIcon name="mail" size={16} /> Mobile / Email</span>
              <input
                placeholder="Enter mobile number or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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
              {loading ? 'Signing in...' : 'Login'}
            </button>
            <p className="login-help-line">Contact admin support if you forgot credentials.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
