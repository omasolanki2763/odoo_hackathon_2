import axios from 'axios';
import { getToken, clearAuthSession } from './utils/authStorage';

// Resolve API base URL: read from VITE_API_URL when deployed, falling back to local /api proxy
const rawApiUrl = import.meta.env.VITE_API_URL;
const trimmedApiUrl = rawApiUrl ? rawApiUrl.replace(/\/+$/, '') : '';
const apiBaseURL = trimmedApiUrl
  ? (trimmedApiUrl.endsWith('/api') ? trimmedApiUrl : `${trimmedApiUrl}/api`)
  : '/api';

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and smooth rapid transitions
api.interceptors.response.use(
  (response) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(response), 50);
    });
  },
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale token only if a session was previously stored
      const token = getToken();
      if (token) {
        clearAuthSession();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;