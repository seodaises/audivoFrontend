const BASE = 'http://localhost:5000/api'; // backend origin — no Vite proxy
const TOKEN_KEY = 'audivo-token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await res.json().catch(() => ({})); // tolerate empty bodies
  if (!res.ok) throw new Error(payload.message || `Request failed (${res.status})`);
  return payload; // your envelope: { success, message, data }
}