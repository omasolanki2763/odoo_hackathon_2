import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Memoize the authentication check to prevent unnecessary re-renders
  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      setUser(userData);
    } else {
      setIsAuthenticated(false);
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Listen for storage changes to update auth state
    const handleStorageChange = () => {
      checkAuth();
    };
    
    // Listen for both storage events and custom events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('auth-change', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('auth-change', handleStorageChange);
    };
  }, [checkAuth]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  }, [navigate]);

  // Show loading state to prevent layout shift
  if (isLoading) {
    return (
      <nav className="navbar" style={{ padding: '1rem 0' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          maxWidth: '1100px', 
          margin: '0 auto', 
          padding: '0 2rem',
          minHeight: '60px'
        }}>
          <Link to="/" className="navbar-logo" style={{ color: '#7dd3fc', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: '0.05em' }}>ReWear</Link>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ width: '100px', height: '20px', background: '#2a2f3a', borderRadius: '4px' }}></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1100px', margin: '0 auto', padding: '0 2rem' }}>
        <Link to="/" className="navbar-logo" style={{ color: '#7dd3fc', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.5rem', letterSpacing: '0.05em' }}>ReWear</Link>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/" className="navbar-link">Home</Link>
          <Link to="/items" className="navbar-link">Browse Items</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="navbar-link">Dashboard</Link>
              <Link to="/add-item" className="navbar-link">List an Item</Link>
              {user?.isAdmin && (
                <Link to="/admin" className="navbar-link">Admin</Link>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: '#7dd3fc', fontSize: '0.9rem' }}>
                  {user?.username || 'User'}
                </span>
                <button 
                  onClick={handleLogout}
                  style={{ 
                    background: 'transparent', 
                    border: '1px solid #7dd3fc', 
                    color: '#7dd3fc', 
                    padding: '0.5rem 1rem', 
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="navbar-link">Login</Link>
              <Link to="/register" className="navbar-link">Sign Up</Link>
            </>
          )}
        </div>
      </div>
      <style>{`
        .navbar-link {
          color: #f3f3f3;
          font-weight: 500;
          transition: color 0.2s ease;
          text-decoration: none;
        }
        .navbar-link:hover {
          color: #7dd3fc;
        }
        .navbar {
          background: rgba(34, 39, 47, 0.95);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 1000;
        }
      `}</style>
    </nav>
  );
};

export default Navbar; 