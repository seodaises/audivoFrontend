import { useSelector, useDispatch } from 'react-redux';
import {
  login as loginThunk,
  registerUser,
  resendVerification as resendVerificationThunk,
  logout as logoutThunk,
  refreshUser as refreshUserThunk,
  updateProfile as updateProfileThunk,
  deleteAccount as deleteAccountThunk,
  changeUsername as changeUsernameThunk,
} from '../slices/authSlice';

export function useAuth() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const loading = useSelector((state) => state.auth.loading);
  const error = useSelector((state) => state.auth.error);

  const login = async (email, password) => {
    try {
      await dispatch(loginThunk({ email, password })).unwrap();
      await dispatch(refreshUserThunk());
      return true;
    } catch {
      return false;
    }
  };

  const register = async (displayName, email, password, username, role) => {
    try {
      await dispatch(registerUser({ displayName, email, password, username, role })).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const resendVerification = async (email) => {
    try {
      await dispatch(resendVerificationThunk(email)).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    await dispatch(logoutThunk());
  };

  const refreshUser = async () => {
    try {
      const action = await dispatch(refreshUserThunk());
      if (refreshUserThunk.fulfilled.match(action)) return action.payload;
      return null;
    } catch {
      return null;
    }
  };

  const updateProfile = async (patch) => {
    try {
      await dispatch(updateProfileThunk(patch)).unwrap();
      return true;
    } catch {
      return false;
    }
  };

  const deleteAccount = async (password) => {
    await dispatch(deleteAccountThunk(password)).unwrap();
  };

  // Preserves the old { ok, error } return shape (not a thrown error) so the
  // dialog can show a field-level message without touching the shared error.
  const changeUsername = async (username) => {
    try {
      await dispatch(changeUsernameThunk(username)).unwrap();
      return { ok: true, error: null };
    } catch (err) {
      return { ok: false, error: err };
    }
  };

  const can = (permission) => !!user?.permissions?.includes(permission);

  return {
    user, error, loading,
    login, register, resendVerification, logout,
    refreshUser, updateProfile, deleteAccount, changeUsername, can,
  };
}

