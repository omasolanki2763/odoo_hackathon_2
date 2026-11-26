import api from '../api';

/**
 * Fetches the authenticated member's profile from `/auth/profile`, syncs
 * `localStorage.userData`, and notifies listeners (including Navbar) via
 * `auth-change` so points balances never stay stale after a swap or redeem.
 *
 * @returns {Promise<object|null>} Updated user profile or null if unavailable
 */
export const refreshSessionUser = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    return null;
  }

  try {
    const res = await api.get('/auth/profile');
    const freshUser = res.data?.data;
    if (freshUser && typeof freshUser === 'object') {
      localStorage.setItem('userData', JSON.stringify(freshUser));
      window.dispatchEvent(new CustomEvent('auth-change', { detail: freshUser }));
      return freshUser;
    }
  } catch {
    // Non-fatal: individual screens handle 401/network states cleanly.
  }

  return null;
};

export default refreshSessionUser;
