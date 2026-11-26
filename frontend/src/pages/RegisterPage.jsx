import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { setAuthSession } from '../utils/authStorage';
import '../styles/AuthPages.css';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

const RegisterPage = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToRules, setAgreedToRules] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateFields = () => {
    const errors = {};
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      errors.username = 'Username must be between 3 and 30 characters.';
    } else if (!USERNAME_PATTERN.test(trimmedUsername)) {
      errors.username = 'Username can only contain letters, numbers, and underscores.';
    }

    if (!trimmedEmail || !EMAIL_PATTERN.test(trimmedEmail)) {
      errors.email = 'Please provide a valid email address.';
    }

    if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters long.';
    } else if (!PASSWORD_COMPLEXITY.test(password)) {
      errors.password = 'Password must contain uppercase, lowercase, and a number.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      errors.confirmPassword = 'Password confirmation does not match password.';
    }

    if (!agreedToRules) {
      errors.agreedToRules = 'Please agree to the community swap rules.';
    }

    return errors;
  };

  const handleFieldChange = (field, value) => {
    if (field === 'username') setUsername(value);
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'confirmPassword') setConfirmPassword(value);
    if (field === 'agreedToRules') setAgreedToRules(value);

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
      const res = await api.post('/auth/register', {
        username: username.trim(),
        email: email.trim(),
        password,
        confirmPassword
      });

      const { token, user } = res.data.data;
      setAuthSession(token, user, true);
      navigate('/dashboard?welcome=1', {
        state: { welcome: true, starterPoints: user?.points ?? 100 }
      });
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
        setServerError(err.response?.data?.message || 'Please fix the validation errors below.');
      } else {
        setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const buildDescribedBy = (hintId, errorId, hasError) => {
    const ids = [];
    if (hintId) ids.push(hintId);
    if (hasError && errorId) ids.push(errorId);
    return ids.length > 0 ? ids.join(' ') : undefined;
  };

  return (
    <div className="auth-page">
      <div className="shell-inner">
        <div className="auth-mobile-back-bar">
          <Link to="/login" className="auth-mobile-back-link">
            &lt; BACK TO SIGN IN
          </Link>
        </div>

        <section className="auth-card" aria-labelledby="register-heading">
          <aside className="auth-aside" aria-label="ReWear Membership Benefits">
            <div>
              <p className="auth-aside-eyebrow">RE:WEAR COMMUNITY ACCESS</p>
              <h2 className="auth-aside-title">Join the exchange.</h2>
              <p className="auth-aside-lead">
                One profile for your wardrobe, your swaps and your points.
              </p>
              <p className="auth-aside-sublead">
                Start with +100 starter points on your ledger. No subscription. No selling fees.
              </p>

              <ul className="auth-aside-list">
                <li>
                  <p className="auth-aside-item-title">
                    <span className="auth-aside-star" aria-hidden="true">*</span>
                    <span>Username is your public handle</span>
                  </p>
                  <p className="auth-aside-item-desc">
                    Letters, numbers and underscores only.
                  </p>
                </li>
                <li>
                  <p className="auth-aside-item-title">
                    <span className="auth-aside-star" aria-hidden="true">*</span>
                    <span>Points follow the garment</span>
                  </p>
                  <p className="auth-aside-item-desc">
                    Each listing carries its own points value.
                  </p>
                </li>
                <li>
                  <p className="auth-aside-item-title">
                    <span className="auth-aside-star" aria-hidden="true">*</span>
                    <span>Admins review every listing</span>
                  </p>
                  <p className="auth-aside-item-desc">
                    New items wait in review before they go live.
                  </p>
                </li>
              </ul>
            </div>

            <p className="auth-aside-footer">+100 STARTER POINTS • ACCOUNTS ARE FREE FOREVER</p>
          </aside>

          <div className="auth-form-panel">
            <header className="auth-form-header">
              <h1 id="register-heading" className="auth-form-title">
                Create Your Account
              </h1>
              <p className="auth-form-subtitle">
                Your handle, your rack, and +100 starter points.
              </p>
            </header>

            {serverError && (
              <div className="auth-alert" role="alert" aria-live="assertive">
                {serverError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="register-username" className="auth-label-mono auth-label-mobile-clay">
                  USERNAME
                </label>
                <input
                  id="register-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  className="auth-input"
                  placeholder="clara_mends"
                  value={username}
                  onChange={(e) => handleFieldChange('username', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={buildDescribedBy(
                    'register-username-hint',
                    'register-username-error',
                    Boolean(fieldErrors.username)
                  )}
                  required
                />
                <p id="register-username-hint" className="auth-field-hint">
                  3 to 30 characters. Letters, numbers, underscore.
                </p>
                {fieldErrors.username && (
                  <p id="register-username-error" className="auth-field-error">
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="register-email" className="auth-label-mono auth-label-mobile-clay">
                  EMAIL ADDRESS
                </label>
                <input
                  id="register-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="auth-input"
                  placeholder="clara@rewear.community"
                  value={email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                  required
                />
                {fieldErrors.email && (
                  <p id="register-email-error" className="auth-field-error">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="register-password" className="auth-label-mono auth-label-mobile-clay">
                  PASSWORD
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="auth-input auth-input-with-toggle"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={buildDescribedBy(
                      'register-password-hint',
                      'register-password-error',
                      Boolean(fieldErrors.password)
                    )}
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
                <p id="register-password-hint" className="auth-field-hint">
                  At least 6 characters with one upper, one lower and one number.
                </p>
                {fieldErrors.password && (
                  <p id="register-password-error" className="auth-field-error">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label
                  htmlFor="register-confirm-password"
                  className="auth-label-mono auth-label-mobile-clay"
                >
                  CONFIRM PASSWORD
                </label>
                <div className="auth-input-wrap">
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="auth-input auth-input-with-toggle"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={
                      fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined
                    }
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-pressed={showConfirmPassword}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <p id="register-confirm-password-error" className="auth-field-error">
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              <div className="auth-checkbox-row">
                <label htmlFor="register-agree" className="auth-checkbox-label">
                  <input
                    id="register-agree"
                    type="checkbox"
                    className="auth-checkbox"
                    checked={agreedToRules}
                    onChange={(e) => handleFieldChange('agreedToRules', e.target.checked)}
                    aria-invalid={Boolean(fieldErrors.agreedToRules)}
                    aria-describedby={fieldErrors.agreedToRules ? 'register-agree-error' : undefined}
                  />
                  <span>I agree to the community swap rules.</span>
                </label>
                {fieldErrors.agreedToRules && (
                  <p id="register-agree-error" className="auth-field-error">
                    {fieldErrors.agreedToRules}
                  </p>
                )}
              </div>

              <button type="submit" className="auth-btn-primary" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>

              <div className="auth-switch-row">
                <span>Already a member?</span>
                <Link to="/login" className="auth-switch-link">
                  Sign in
                </Link>
              </div>
            </form>

            <p className="auth-form-footnote">
              We only use your email for swap and listing updates.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RegisterPage;
