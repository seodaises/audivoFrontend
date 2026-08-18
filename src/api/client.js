import axios from 'axios';
import { LOGIN } from '../constants/route_constant';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const http = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

const SESSION_OPTIONAL_PATHS = ['/auth/me', '/auth/login'];

const isSessionOptional = (url = '') =>
  SESSION_OPTIONAL_PATHS.some((p) => url.startsWith(p));

http.interceptors.response.use(
  (response) => response.data, // your envelope: { success, message, data }
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    const message =
      error.response?.data?.message ||
      error.message ||
      'Request failed';

    if (status === 401 && !isSessionOptional(url)) {
      if (window.location.pathname !== LOGIN) {
        window.location.assign(LOGIN);
      }
    }

    const err = new Error(message);
    err.status = status;
    return Promise.reject(err);
  }
);

export { API_BASE_URL };

export async function api(path, { method = 'GET', body } = {}) {
  return http.request({
    url: path,
    method,
    ...(body ? { data: body } : {}),
  });
}