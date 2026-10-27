// client/src/services/api.js
// Single configured Axios instance using VITE_API_BASE_URL
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor: attach JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medislot_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: redirect on expired token
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRoute =
      window.location.pathname.startsWith('/login') ||
      window.location.pathname.startsWith('/register');

    if (error.response?.status === 401 && !isAuthRoute && localStorage.getItem('medislot_token')) {
      localStorage.removeItem('medislot_token');
      localStorage.removeItem('medislot_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
