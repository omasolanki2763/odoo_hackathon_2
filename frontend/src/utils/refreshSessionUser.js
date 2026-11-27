import api from '../api';
import { getToken } from './authStorage';

/**
 * Fetches `/auth/profile`, updates `userData` in whichever browser storage
 * (`localStorage` or `sessionStorage`) holds the active session token, and
 * dispatches `auth-change` so Navbar stays in sync after any points change.
 *
 * @returns {Promise<object|null>} Updated user profile or null if unavailable
 */
export const refreshSessionUser = async () => {
  const token = getToken();
  if (!token) {
    return null;
  }

  const useLocal = (() => {
    try {
      return Boolean(localStorage.getItem('token'));
    } catch {
      return true;
    }
  })();

  try {
    const res = await api.get('/auth/profile');
    const freshUser = res.data?.data;
    if (freshUser && typeof freshUser === 'object') {
      try {
        const target = useLocal ? localStorage : sessionStorage;
        const other = useLocal ? sessionStorage : localStorage;
        other.removeItem('userData');
        target.setItem('userData', JSON.stringify(freshUser));
      } catch {
        // Ignore storage quota errors in restricted browsing contexts
      }
      window.dispatchEvent(new CustomEvent('auth-change', { detail: freshUser }));
      return freshUser;
    }
  } catch {
    // Non-fatal: individual screens handle 401/network states cleanly.
  }

  return null;
};

export default refreshSessionUser;
