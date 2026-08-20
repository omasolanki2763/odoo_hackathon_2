import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Use relative path with Vite proxy
  headers: {
    'Content-Type': 'application/json',
  },
  // Add timeout to prevent hanging requests
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug: Log all API requests
    console.log(`🔄 API Request [${config.method?.toUpperCase()}] ${config.url}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors and reduce glitching
api.interceptors.response.use(
  (response) => {
    // Debug: Log all successful API responses
    console.log(`✅ API Success [${response.config.method?.toUpperCase()}] ${response.config.url}:`, response.data);
    
    // Add a small delay to smooth out rapid responses
    return new Promise(resolve => {
      setTimeout(() => resolve(response), 50);
    });
  },
  (error) => {
    // Debug: Log all API errors (except 401 for unauthenticated requests)
    if (error.response?.status !== 401) {
      console.error(`❌ API Error [${error.config?.method?.toUpperCase()}] ${error.config?.url}:`, {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.log(`ℹ️ Unauthenticated request to ${error.config?.url} (expected for public pages)`);
    }
    
    if (error.response?.status === 401) {
      // Only redirect if we have a token (meaning it's expired/invalid)
      const token = localStorage.getItem('token');
      if (token) {
        localStorage.removeItem('token');
        localStorage.removeItem('userData');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api; 