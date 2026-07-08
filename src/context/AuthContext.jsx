import { createContext, useContext, useState, useEffect } from 'react';     
import { api, setToken, clearToken, getToken } from '../api/client';
import { ROLES } from '../auth/permissions';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const shapeUser = (u) => {
  const key = (u.role || '').toLowerCase().replace(/\s+/g, '_');
  const role = ROLES[key] || { key, label: u.role || 'Unknown', level: 0, permissions: [] };
  const permissions = Array.isArray(u.permissions) ? u.permissions : role.permissions;

  return {
    id: u.id,
    name: u.displayName,
    username: u.username ?? null,
    email: u.email,
    firstName: u.firstName ?? null,
    lastName: u.lastName ?? null,
    fullName: u.fullName ?? null,
    avatarUrl: u.avatarUrl ?? null,
    gender: u.gender ?? null,
    birthday: u.birthday ?? null,
    phoneNumber: u.phoneNumber ?? null,
    address: u.address ?? { street: null, city: null, country: null, postalCode: null },
    role: role.label,
    roleKey: role.key,
    level: role.level,
    permissions,
    isVerified: u.isVerified,
    mustChangePassword: u.mustChangePassword ?? false,
  };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('audivo-user');
    return saved ? JSON.parse(saved) : null;
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const persist = (shaped) => {
    setUser(shaped);
    localStorage.setItem('audivo-user', JSON.stringify(shaped));
  };

  const applySession = (data) => {
    setToken(data.token);
    persist(shapeUser(data.user));
  };

  const login = async (email, password) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api('/auth/login', { method: 'POST', body: { email, password } });
      applySession(data);
      await refreshUser();
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setLoading(false); }
  };

   const register = async (displayName, email, password, username, role) => {
  setLoading(true); setError(null);
  try {
    await api('/auth/register', { method: 'POST', body: { displayName, email, password, username, role } });
    return true;
  } catch (err) { setError(err.message); return false; }
  finally { setLoading(false); }
};

  const resendVerification = async (email) => {
    setError(null);
    try {
      await api('/auth/resend-verification', { method: 'POST', body: { email } });
      return true;
    } catch (err) { setError(err.message); return false; }
  };

  const logout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* cleared regardless */ }
    clearToken();
    localStorage.removeItem('audivo-user');
    setUser(null);
  };

  const refreshUser = async () => {
    if (!getToken()) return null;
    try {
      const { data } = await api('/auth/me');
      const shaped = shapeUser(data);
      persist(shaped);
      return shaped;
    } catch { return null; }
  };

  const updateProfile = async (patch) => {
    setLoading(true); setError(null);
    try {
      const { data } = await api('/auth/me', { method: 'PUT', body: patch });
      persist(shapeUser(data));
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setLoading(false); }
  };

  const deleteAccount = async (password) => {
    await api('/auth/me', { method: 'DELETE', body: { password } });
    clearToken();
    localStorage.removeItem('audivo-user');
    setUser(null);
  };

  // Change the current user's handle. Returns { ok, error } so the dialog can
  // show a field-level message (e.g. 409 "Username already taken") without
  // clobbering the shared profile error.
  const changeUsername = async (username) => {
    try {
      await api('/auth/me/username', { method: 'PATCH', body: { username } });
      await refreshUser();
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const can = (permission) => !!user?.permissions?.includes(permission);
  useEffect(() => {
    refreshUser();
  }, []);

  return (
    <AuthContext.Provider value={{
      user, error, loading,
      login, register, resendVerification, logout,
      refreshUser, updateProfile, deleteAccount, changeUsername, can,
    }}>
      {children}
    </AuthContext.Provider>
  );
}