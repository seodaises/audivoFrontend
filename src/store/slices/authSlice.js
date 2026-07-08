import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/client';
import { ROLES } from '../../auth/permissions';

// NOTE: There is no token handling in this slice anymore. The JWT lives in an
// httpOnly cookie set by the backend — invisible to JavaScript. The browser
// sends it automatically on every request (axios withCredentials). The user
// object lives in Redux memory only and is NEVER persisted; on a refresh it is
// re-fetched from /auth/me, which the cookie authenticates.

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

// ---------------------------------------------------------------------------
// Async thunks
// ---------------------------------------------------------------------------

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      // Backend sets the auth cookie and returns { user } only (no token).
      const { data } = await api('/auth/login', { method: 'POST', body: { email, password } });
      return data; // { user }
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// Re-fetches /auth/me. No token guard — the cookie (if present) authenticates
// the request; if there's no valid cookie the backend returns 401 and this
// rejects. Runs on app load (via AuthBootstrap) and after login.
export const refreshUser = createAsyncThunk(
  'auth/refreshUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api('/auth/me');
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ displayName, email, password, username, role }, { rejectWithValue }) => {
    try {
      await api('/auth/register', { method: 'POST', body: { displayName, email, password, username, role } });
      return true;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async (email, { rejectWithValue }) => {
    try {
      await api('/auth/resend-verification', { method: 'POST', body: { email } });
      return true;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    try {
      // Backend clears the cookie. We clear the in-memory user regardless.
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // cleared regardless
    }
    return true;
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (patch, { rejectWithValue }) => {
    try {
      const { data } = await api('/auth/me', { method: 'PUT', body: patch });
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteAccount = createAsyncThunk(
  'auth/deleteAccount',
  async (password, { rejectWithValue }) => {
    try {
      // Backend deletes the account AND clears the cookie.
      await api('/auth/me', { method: 'DELETE', body: { password } });
      return true;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const changeUsername = createAsyncThunk(
  'auth/changeUsername',
  async (username, { dispatch, rejectWithValue }) => {
    try {
      await api('/auth/me/username', { method: 'PATCH', body: { username } });
      await dispatch(refreshUser());
      return true;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const initialState = {
  user: null,
  loading: false,
  error: null,
  // True until the first refreshUser (on app load) settles. RequireAuth uses
  // this to show a "checking session" state instead of redirecting to /login
  // before we know whether the cookie represents a valid session.
  checkingSession: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // ---- login ----
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = shapeUser(action.payload.user);
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ---- refreshUser ----
      .addCase(refreshUser.fulfilled, (state, action) => {
        state.user = shapeUser(action.payload);
        state.checkingSession = false;
      })
      .addCase(refreshUser.rejected, (state) => {
        // Cookie missing/expired/invalid → no valid session. Clear any stale
        // user so route guards correctly treat this as logged-out (this is
        // the refresh-gap fix).
        state.user = null;
        state.checkingSession = false;
      })

      // ---- register ----
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ---- resendVerification ----
      .addCase(resendVerification.rejected, (state, action) => {
        state.error = action.payload;
      })

      // ---- logout ----
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      })

      // ---- updateProfile ----
      .addCase(updateProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = shapeUser(action.payload);
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ---- deleteAccount ----
      .addCase(deleteAccount.fulfilled, (state) => {
        state.user = null;
      })

      .addDefaultCase(() => {});
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;

