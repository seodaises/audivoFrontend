import { api } from './client';

// GET /auth/login-history
// -> [{ id, ipAddress, userAgent, at }]  (newest first, capped at 20 by the backend)
export function fetchLoginHistory() {
  return api('/auth/login-history').then((res) => res.data);
}