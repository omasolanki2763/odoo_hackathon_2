import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { getToken, getStoredUser, clearAuthSession } from '../utils/authStorage';

const NAV_LINKS = [
  { to: '/items', label: 'Browse Catalogue' },
  { to: '/add-item', label: 'List an Item' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/swaps', label: 'Swaps' },
];

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const avatarMenuRef = useRef(null);

  const checkAuth = useCallback(() => {
    const token = getToken();
    if (token) {
      setIsAuthenticated(true);
      setUser(getStoredUser() || {});
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [checkAuth]);

  // Close menus on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setAvatarMenuOpen(false);
  }, [location.pathname]);

  // Close avatar dropdown and mobile drawer on Escape or outside click
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setAvatarMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = useCallback(() => {
    clearAuthSession();
    setIsAuthenticated(false);
    setUser(null);
    setAvatarMenuOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  }, [navigate]);

  const username = user?.username || 'member';
  const points = typeof user?.points === 'number' ? user.points : 0;
  const userInitial = username.charAt(0).toUpperCase();

  return (
    <header className="shell-header">
      <div className="shell-ticker">
        <div className="shell-inner shell-ticker-inner">
          <span>RE:WEAR LOOKBOOK &bull; ISSUE NO. 04 &bull; AUTUMN CIRCULATION</span>
          <span className="shell-ticker-right">ZERO FEES &bull; 100% COMMUNITY OWNED</span>
        </div>
      </div>

      <div className="shell-masthead">
        <div className="shell-inner">
          <div className="shell-masthead-bar">
            <div className="shell-brand-group">
              <Link to="/" className="shell-brand">
                RE:WEAR
              </Link>
              <span className="shell-tagline">The Community Clothing Exchange</span>
            </div>

            <nav className="shell-nav" aria-label="Main navigation">
              {NAV_LINKS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `shell-nav-link${isActive ? ' is-active' : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>

            <div className="shell-actions">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="shell-points-pill"
                    aria-label={`${points} points balance`}
                  >
                    <span className="shell-points-value font-number">{points}</span>
                    <span className="shell-points-unit">PTS</span>
                  </Link>

                  <div className="shell-avatar-wrap" ref={avatarMenuRef}>
                    <button
                      type="button"
                      className="shell-avatar-trigger"
                      aria-haspopup="menu"
                      aria-expanded={avatarMenuOpen}
                      aria-controls="shell-avatar-dropdown"
                      onClick={() => setAvatarMenuOpen((prev) => !prev)}
                    >
                      <span className="shell-avatar-badge" aria-hidden="true">
                        {userInitial}
                      </span>
                      <span className="shell-avatar-name">{username}</span>
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2.5 4.5L6 8L9.5 4.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="square"
                        />
                      </svg>
                    </button>

                    {avatarMenuOpen && (
                      <div
                        id="shell-avatar-dropdown"
                        className="shell-avatar-dropdown"
                        role="menu"
                      >
                        <div className="shell-avatar-summary">
                          <span className="shell-avatar-handle">@{username}</span>
                          <span className="shell-avatar-pts">
                            <span className="font-number">{points}</span> PTS AVAILABLE
                          </span>
                        </div>
                        <Link
                          to="/dashboard"
                          className="shell-dropdown-item"
                          role="menuitem"
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/add-item"
                          className="shell-dropdown-item"
                          role="menuitem"
                        >
                          List an Item
                        </Link>
                        <Link
                          to="/swaps"
                          className="shell-dropdown-item"
                          role="menuitem"
                        >
                          Swaps
                        </Link>
                        <Link
                          to="/points"
                          className="shell-dropdown-item"
                          role="menuitem"
                        >
                          Points history
                        </Link>
                        {user?.isAdmin && (
                          <Link
                            to="/admin"
                            className="shell-dropdown-item"
                            role="menuitem"
                          >
                            Admin Panel
                          </Link>
                        )}
                        <div className="shell-dropdown-divider" role="separator" />
                        <button
                          type="button"
                          className="shell-dropdown-item shell-dropdown-signout"
                          role="menuitem"
                          onClick={handleLogout}
                        >
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <NavLink
                    to="/login"
                    className={({ isActive }) =>
                      `shell-btn shell-btn-secondary${isActive ? ' is-active' : ''}`
                    }
                  >
                    Sign in
                  </NavLink>
                  <NavLink to="/register" className="shell-btn shell-btn-accent">
                    Join
                  </NavLink>
                </>
              )}
            </div>

            <button
              type="button"
              className="shell-menu-toggle"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
            >
              <span>{mobileMenuOpen ? 'Close' : 'Menu'}</span>
              {mobileMenuOpen ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3 3L13 13M13 3L3 13"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M2 5H14M2 11H14"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      <div
        id="mobile-nav-drawer"
        className={`shell-mobile-drawer${mobileMenuOpen ? ' is-open' : ''}`}
      >
        <div className="shell-inner">
          <nav className="shell-mobile-nav" aria-label="Mobile navigation">
            {NAV_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `shell-mobile-link${isActive ? ' is-active' : ''}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            {isAuthenticated && user?.isAdmin && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `shell-mobile-link${isActive ? ' is-active' : ''}`
                }
              >
                Admin Panel
              </NavLink>
            )}
          </nav>

          <div className="shell-mobile-auth">
            {isAuthenticated ? (
              <>
                <div className="shell-mobile-user-row">
                  <span className="shell-avatar-handle">@{username}</span>
                  <span className="shell-points-pill">
                    <span className="shell-points-value font-number">{points}</span>
                    <span className="shell-points-unit">PTS</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="shell-btn shell-btn-secondary"
                  onClick={handleLogout}
                >
                  Sign out
                </button>
              </>
            ) : (
              <div className="shell-mobile-auth-buttons">
                <NavLink to="/login" className="shell-btn shell-btn-secondary">
                  Sign in
                </NavLink>
                <NavLink to="/register" className="shell-btn shell-btn-accent">
                  Join
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
