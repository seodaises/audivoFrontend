import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/client';
import { ROLES } from '../../auth/permissions';
import { reset as resetPlayer } from './playerSlice';
import { setPlaybarHidden as setPlaybarHiddenAction } from './sidebarSlice';

const shapeUser = (u) => {
  const key = (u.role || '').toLowerCase().replace(/\s+/g, '_');
  const role = ROLES[key] || { key, label: u.role || 'Unknown', level: 0, permissions: [] };
  const sent = Array.isArray(u.permissions) ? u.permissions : [];
  const permissions = sent.length ? sent : role.permissions;

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
  async (_, { dispatch }) => {
    try {
      // Backend clears the cookie. We clear the in-memory user regardless.
      await api('/auth/logout', { method: 'POST' });
    } catch {
      // cleared regardless
    }
    // Stop playback and tear down the player so audio doesn't keep going and
    // the now-playing bar disappears when the session ends.
    dispatch(resetPlayer());
    dispatch(setPlaybarHiddenAction(true));
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
  async (password, { dispatch, rejectWithValue }) => {
    try {
      // Backend deletes the account AND clears the cookie.
      await api('/auth/me', { method: 'DELETE', body: { password } });
      // Same teardown as logout — the session is over.
      dispatch(resetPlayer());
      dispatch(setPlaybarHiddenAction(true));
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
        state.user = null;
        state.checkingSession = false;
        state.error = null;
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