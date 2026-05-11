import axios from 'axios';

export const API_BASE_URL = 'http://localhost:3001';
let authToken = localStorage.getItem('factory_pos_token') || '';

export const setAuthToken = (token: string) => {
  authToken = token;
  localStorage.setItem('factory_pos_token', token);
};

export const clearAuthToken = () => {
  authToken = '';
  localStorage.removeItem('factory_pos_token');
};

export const getAuthToken = () => authToken;

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);