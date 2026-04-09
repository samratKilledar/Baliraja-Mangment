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

const SUPER_ADMIN_EMAIL = 'superadmin@cognitix.tech';
const SUPER_ADMIN_RECOVERY_EMAIL = 'hrinfocognitix@gmail.com';
const SMTP_CONFIG_ERROR_TEXT =
  'Email service is not configured. Set RESET_EMAIL_USER and RESET_EMAIL_APP_PASSWORD, or SMTP_HOST with SMTP_USER/SMTP_PASS, or SMTP_HOST with SMTP_NO_AUTH=true.';

export default function LoginPage() {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resetPreviewPassword, setResetPreviewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
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

  function mapForgotPasswordError(message) {
    if (!message) return 'Unable to send reset password email.';
    if (message.includes('Email service is not configured')) {
      return 'Reset password email service is temporarily unavailable. Please contact support/admin.';
    }
    if (message === SMTP_CONFIG_ERROR_TEXT) {
      return 'Reset password email service is temporarily unavailable. Please contact support/admin.';
    }
    return message;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    setResetPreviewPassword('');

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

  async function onForgotSuperAdminPassword() {
    setError('');
    setNotice('');
    setResetPreviewPassword('');

    if (identifier.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
      setError(`Forgot flow is only for ${SUPER_ADMIN_EMAIL}.`);
      return;
    }

    try {
      setResetLoading(true);
      const { data } = await api.post('/auth/forgot-super-admin-password', {
        email: SUPER_ADMIN_EMAIL
      });
      setNotice(data?.message || `Reset password sent to ${SUPER_ADMIN_RECOVERY_EMAIL}.`);
      if (data?.tempPassword) {
        setResetPreviewPassword(data.tempPassword);
      }
    } catch (err) {
      const rawMessage = err?.response?.data?.message || '';
      setError(mapForgotPasswordError(rawMessage));
    } finally {
      setResetLoading(false);
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
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </label>

            <label className="field">
              <span><VectorIcon name="lock" size={16} /> Password</span>
              <input
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
              className="ghost-btn"
              style={{ marginTop: 10, width: '100%' }}
              onClick={onForgotSuperAdminPassword}
              disabled={resetLoading}
            >
              {resetLoading ? 'Sending Reset...' : 'Reset Super Admin Password'}
            </button>
            {resetPreviewPassword ? (
              <p className="login-help-line" style={{ wordBreak: 'break-all', marginTop: 10 }}>
                Sent Password (demo): <strong>{resetPreviewPassword}</strong>
              </p>
            ) : (
              <p className="login-help-line">Contact admin support if you forgot credentials.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
