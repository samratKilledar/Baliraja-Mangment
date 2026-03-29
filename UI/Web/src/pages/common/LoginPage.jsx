import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VectorIcon from '../../components/VectorIcon';
import api from '../../api/client';

const TRAINING_IMAGES = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1400&q=80'
];

const FUTURE_LINES = [
  'Future leaders are trained here every day.',
  'Today learning, tomorrow success.',
  'Skills grow here. Careers launch here.',
  'Every login is a step toward a brighter future.'
];

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState(import.meta.env.VITE_SUPER_EMAIL || 'superadmin@baliraja.com');
  const [password, setPassword] = useState(import.meta.env.VITE_SUPER_PASSWORD || '123456');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotRecoveryKey, setForgotRecoveryKey] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotNotice, setForgotNotice] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [futureIndex, setFutureIndex] = useState(0);

  useEffect(() => {
    const reason = localStorage.getItem('ims_logout_reason');
    if (reason === 'expired') {
      setNotice('Your session expired. Please sign in again.');
    }
    localStorage.removeItem('ims_logout_reason');
  }, []);

  useEffect(() => {
    const imageTimer = window.setInterval(() => {
      setImageIndex((prev) => (prev + 1) % TRAINING_IMAGES.length);
    }, 4500);
    return () => window.clearInterval(imageTimer);
  }, []);

  useEffect(() => {
    const futureTimer = window.setInterval(() => {
      setFutureIndex((prev) => (prev + 1) % FUTURE_LINES.length);
    }, 3200);
    return () => window.clearInterval(futureTimer);
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

  async function onForgotSubmit(e) {
    e.preventDefault();
    setForgotError('');
    setForgotNotice('');

    if (!forgotEmail.trim()) {
      setForgotError('Enter super admin email.');
      return;
    }
    if (!forgotRecoveryKey.trim()) {
      setForgotError('Enter recovery key.');
      return;
    }
    if (forgotPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (forgotPassword !== forgotConfirmPassword) {
      setForgotError('Password and confirm password do not match.');
      return;
    }

    try {
      setForgotLoading(true);
      const { data } = await api.post('/auth/forgot-super-admin-password', {
        email: forgotEmail.trim().toLowerCase(),
        recoveryKey: forgotRecoveryKey.trim(),
        newPassword: forgotPassword
      });
      setForgotNotice(data?.message || 'Password reset successful.');
      setForgotPassword('');
      setForgotConfirmPassword('');
    } catch (err) {
      setForgotError(err?.response?.data?.message || 'Unable to reset password.');
    } finally {
      setForgotLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="login-demo-frame fade-up">
        <div className="login-demo-card">
          <section className="login-illustration-pane">
            <div
              className="login-illustration-art"
              style={{ backgroundImage: `url(${TRAINING_IMAGES[imageIndex]})` }}
            >
              <div className="login-illustration-overlay" />
              <div className="login-lottie-logo-wrap">
                <dotlottie-player
                  src="/assets/login-lottie.json"
                  background="transparent"
                  speed="1"
                  loop
                  autoplay
                ></dotlottie-player>
              </div>
              <p className="login-image-label">Academy Training Session</p>
            </div>
            <div className="login-illustration-copy">
              <h1 className="brand-heading">Baliraja Academy</h1>
              <p className="auth-subtitle">Management Portal</p>
              <p className="future-line" key={futureIndex}>{FUTURE_LINES[futureIndex]}</p>
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
            <button
              type="button"
              className="ghost-btn btn btn-outline-secondary w-100"
              style={{ marginTop: 8 }}
              onClick={() => {
                setForgotOpen((prev) => !prev);
                setForgotError('');
                setForgotNotice('');
              }}
            >
              {forgotOpen ? 'Hide Forgot Password' : 'Forgot Password?'}
            </button>
            {forgotOpen ? (
              <form onSubmit={onForgotSubmit} style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                <label className="field" style={{ marginTop: 0 }}>
                  <span><VectorIcon name="mail" size={16} /> Registered Email</span>
                  <input
                    placeholder="Enter registered email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </label>
                <label className="field" style={{ marginTop: 0 }}>
                  <span><VectorIcon name="shield" size={16} /> Recovery Key</span>
                  <input
                    placeholder="Enter recovery key"
                    value={forgotRecoveryKey}
                    onChange={(e) => setForgotRecoveryKey(e.target.value)}
                  />
                </label>
                <label className="field" style={{ marginTop: 0 }}>
                  <span><VectorIcon name="lock" size={16} /> New Password</span>
                  <input
                    placeholder="New password"
                    type="password"
                    value={forgotPassword}
                    onChange={(e) => setForgotPassword(e.target.value)}
                  />
                </label>
                <label className="field" style={{ marginTop: 0 }}>
                  <span><VectorIcon name="lock" size={16} /> Confirm Password</span>
                  <input
                    placeholder="Confirm new password"
                    type="password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                  />
                </label>
                {forgotError ? <p className="error" style={{ marginTop: 0 }}>{forgotError}</p> : null}
                {forgotNotice ? <p style={{ color: '#1e8e3e', marginTop: 0 }}>{forgotNotice}</p> : null}
                <button className="primary-btn btn btn-primary" type="submit" disabled={forgotLoading}>
                  {forgotLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            ) : null}
            <p className="login-help-line">Contact admin support if you forgot credentials.</p>
          </form>
        </div>
      </div>
    </div>
  );
}
