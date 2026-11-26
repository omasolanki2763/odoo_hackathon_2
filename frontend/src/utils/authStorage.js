const TOKEN_KEY = 'token';
const USER_KEY = 'userData';

/**
 * Reads the persisted JWT token from localStorage or sessionStorage.
 */
export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

/**
 * Safely parses the stored user object from localStorage or sessionStorage.
 */
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Saves auth credentials in localStorage (remember=true) or sessionStorage (remember=false)
 * and notifies listeners such as the header navigation bar.
 */
export const setAuthSession = (token, user, remember = true) => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    const target = remember ? localStorage : sessionStorage;
    target.setItem(TOKEN_KEY, token);
    target.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore storage quota errors in restricted browsing contexts
  }
  window.dispatchEvent(new Event('auth-change'));
};

/**
 * Removes stored auth state from both localStorage and sessionStorage and notifies listeners.
 */
export const clearAuthSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  } catch {
    // Ignore storage errors
  }
  window.dispatchEvent(new Event('auth-change'));
};
