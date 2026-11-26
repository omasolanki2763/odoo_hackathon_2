import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { setAuthSession } from '../utils/authStorage';
import '../styles/AuthPages.css';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateFields = () => {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Please enter your email address.';
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Please enter your password.';
    }

    return errors;
  };

  const handleFieldChange = (field, value) => {
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);

    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    const errors = validateFields();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim(),
        password
      });

      const { token, user } = res.data.data;
      setAuthSession(token, user, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        const mapped = {};
        apiErrors.forEach((item) => {
          if (item.field && !mapped[item.field]) {
            mapped[item.field] = item.message;
          }
        });
        setFieldErrors(mapped);
        setServerError(err.response?.data?.message || 'Please check the highlighted fields.');
      } else {
        setServerError(err.response?.data?.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="shell-inner">
        <div className="auth-mobile-back-bar">
          <Link to="/items" className="auth-mobile-back-link">
            &lt; Browse Catalogue
          </Link>
        </div>

        <section className="auth-card" aria-labelledby="login-heading">
          <aside className="auth-aside" aria-label="ReWear Community Access">
            <div>
              <p className="auth-aside-eyebrow">RE:WEAR COMMUNITY ACCESS</p>
              <h2 className="auth-aside-title">A shared wardrobe across cities.</h2>
              <p className="auth-aside-lead">
                We believe clothing belongs in circulation, not landfills. No platform cut. No
                algorithmic hype. Just honest garments finding thoughtful second lives through
                direct community exchange.
              </p>

              <ul className="auth-aside-list">
                <li>
                  <p className="auth-aside-item-title">
                    <span className="auth-aside-star" aria-hidden="true">*</span>
                    <span>Zero Commercial Fees</span>
                  </p>
                  <p className="auth-aside-item-desc">
                    Points circulate directly inside the community exchange.
                  </p>
                </li>
                <li>
                  <p className="auth-aside-item-title">
                    <span className="auth-aside-star" aria-hidden="true">*</span>
                    <span>Honest Condition Ledger</span>
                  </p>
                  <p className="auth-aside-item-desc">
                    Detailed rubrics, flat measurements, real wear notes.
                  </p>
                </li>
                <li>
                  <p className="auth-aside-item-title">
                    <span className="auth-aside-star" aria-hidden="true">*</span>
                    <span>Direct Wardrobe Swaps</span>
                  </p>
                  <p className="auth-aside-item-desc">
                    Trade piece-for-piece or redeem garments with points.
                  </p>
                </li>
              </ul>
            </div>

            <p className="auth-aside-footer">ACCOUNTS ARE FREE FOREVER</p>
          </aside>

          <div className="auth-form-panel">
            <header className="auth-form-header">
              <h1 id="login-heading" className="auth-form-title">
                Sign In to Your Wardrobe
              </h1>
              <p className="auth-form-subtitle">
                Access your listed garments, active swap proposals, and points ledger.
              </p>
            </header>

            {serverError && (
              <div className="auth-alert" role="alert" aria-live="assertive">
                {serverError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="login-email" className="auth-label">
                  Email
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="auth-input"
                  placeholder="clara@rewear.community"
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                  required
                />
                {fieldErrors.email && (
                  <p id="login-email-error" className="auth-field-error">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="login-password" className="auth-label">
                  Password
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="auth-input auth-input-with-toggle"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="login-password-error" className="auth-field-error">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="auth-checkbox-row">
                <label htmlFor="login-remember" className="auth-checkbox-label">
                  <input
                    id="login-remember"
                    type="checkbox"
                    className="auth-checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep me signed in on this device</span>
                </label>
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="auth-divider" aria-hidden="true">
                <span className="auth-divider-line" />
                <span className="auth-divider-text">OR NEW MEMBER</span>
                <span className="auth-divider-line" />
              </div>

              <Link to="/register" className="auth-btn-secondary">
                Create Account (+100 Starter Points)
              </Link>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
