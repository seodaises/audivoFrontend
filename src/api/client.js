import axios from 'axios';

// The auth token lives in an httpOnly cookie set by the backend. axios with
// withCredentials: true makes the browser send that cookie on every request
// (and store it from responses) automatically. No token is ever read, stored,
// or attached by this code — it can't be, the cookie is invisible to JS.
const http = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    // Defeat browser 304-caching on GETs. Session-sensitive endpoints like
    // /auth/me must always reach the server; a cached response can make a
    // logged-in user look logged out after a refresh. (Backend also sends
    // no-store headers on auth routes — this is the client-side counterpart.)
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

// Response interceptor: unwrap the backend envelope and normalize errors so
// callers keep receiving { success, message, data } on success and a thrown
// Error with the backend's message on failure — same contract as before.
http.interceptors.response.use(
  (response) => response.data, // your envelope: { success, message, data }
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  }
);

// Same signature the thunks already call: api(path, { method, body }).
export async function api(path, { method = 'GET', body } = {}) {
  return http.request({
    url: path,
    method,
    ...(body ? { data: body } : {}),
  });
}