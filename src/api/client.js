import axios from 'axios';
import { LOGIN } from '../constants/route_constant';

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

// Endpoints where a 401 is a NORMAL, EXPECTED answer rather than a dead session:
//
//   /auth/me     -> a guest with no cookie. The app calls this on boot to decide
//                   whether anyone is logged in. Redirecting on this 401 would
//                   trap every logged-out visitor in a loop: land on /login,
//                   boot, call /me, get 401, redirect to /login, boot, ...
//   /auth/login  -> a wrong password. The login form needs to SHOW that message,
//                   not navigate away from itself.
//
// A 401 from anywhere else means something different: we had a working session
// a moment ago and the server has now rejected it. The backend's `protect`
// middleware returns exactly that when an account is soft-deleted mid-session
// (and clears the cookie as it does). That is not an error to render in a red
// alert on the current page — the user is no longer authenticated and every
// subsequent request will fail too. They belong at /login.
const SESSION_OPTIONAL_PATHS = ['/auth/me', '/auth/login'];

const isSessionOptional = (url = '') =>
  SESSION_OPTIONAL_PATHS.some((p) => url.startsWith(p));

// Response interceptor: unwrap the backend envelope and normalize errors so
// callers keep receiving { success, message, data } on success and a thrown
// Error with the backend's message on failure — same contract as before.
http.interceptors.response.use(
  (response) => response.data, // your envelope: { success, message, data }
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';

    const message =
      error.response?.data?.message ||
      error.message ||
      'Request failed';

    // Session died mid-use. Hard-navigate rather than dispatching a logout
    // thunk, for two reasons:
    //
    //  1. No circular import. This module would otherwise have to import the
    //     Redux store, which imports the slices, which import this module.
    //  2. A full page load wipes in-memory Redux state for free — which is
    //     exactly what we want. redux-persist only holds theme + sidebar here,
    //     so nothing stale about the user survives the reload.
    //
    // The `!== LOGIN` guard is belt-and-braces: if we are somehow already on
    // /login, don't kick off a navigation to the page we're standing on.
    if (status === 401 && !isSessionOptional(url)) {
      if (window.location.pathname !== LOGIN) {
        window.location.assign(LOGIN);
      }
    }

    // Attach the status so callers CAN branch on it if they ever need to. The
    // thrown value is still an Error with the backend's message, so every
    // existing `catch (e) { setErr(e.message) }` keeps working untouched.
    const err = new Error(message);
    err.status = status;
    return Promise.reject(err);
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