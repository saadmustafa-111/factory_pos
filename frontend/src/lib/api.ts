import axios from 'axios';

export const API_BASE_URL = 'http://127.0.0.1:6101';
export const API_TIMEOUT_MS = 10000;
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
  timeout: API_TIMEOUT_MS,
});

export const isBackendUnavailableError = (error: unknown) =>
  axios.isAxiosError(error) &&
  (!error.response ||
    error.code === 'ECONNABORTED' ||
    error.code === 'ERR_NETWORK');

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
      window.location.replace('/#/login');
    }
    return Promise.reject(error);
  },
);
