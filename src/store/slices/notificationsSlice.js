import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications';

export const loadNotifications = createAsyncThunk(
  'notifications/load',
  async ({ page = 1, limit = 20, unreadOnly = false } = {}, { rejectWithValue }) => {
    try {
      const data = await fetchNotifications({ page, limit, unreadOnly });
      return { ...data, page };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const loadUnreadCount = createAsyncThunk(
  'notifications/unreadCount',
  async (_arg, { rejectWithValue }) => {
    try {
      const data = await fetchUnreadCount();
      return data.unread;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markRead = createAsyncThunk(
  'notifications/markRead',
  async (notificationId, { rejectWithValue }) => {
    try {
      await markNotificationRead(notificationId);
      return notificationId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_arg, { rejectWithValue }) => {
    try {
      const data = await markAllNotificationsRead();
      return data.updated;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);


const initialState = {
  items: [],
  unread: 0,
  page: 1,
  totalPages: 1,
  total: 0,
  loading: false,   // first page / replacing the list
  loadingMore: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotifications: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // ---- feed ----
      .addCase(loadNotifications.pending, (state, action) => {
        const appending = (action.meta.arg?.page ?? 1) > 1;
        if (appending) state.loadingMore = true;
        else state.loading = true;
        state.error = null;
      })
      .addCase(loadNotifications.fulfilled, (state, action) => {
        const { items, pagination, page } = action.payload;
        state.items = page > 1 ? [...state.items, ...items] : items;
        state.page = pagination?.page ?? page;
        state.totalPages = pagination?.totalPages ?? 1;
        state.total = pagination?.total ?? state.items.length;
        state.loading = false;
        state.loadingMore = false;
      })
      .addCase(loadNotifications.rejected, (state, action) => {
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload || 'Could not load notifications';
      })

      .addCase(loadUnreadCount.fulfilled, (state, action) => {
        state.unread = action.payload;
      })

      .addCase(markRead.pending, (state, action) => {
        const id = action.meta.arg;
        const row = state.items.find((n) => n.id === id);
        if (row && !row.isRead) {
          row.isRead = true;
          state.unread = Math.max(0, state.unread - 1);
        }
      })
      .addCase(markRead.rejected, (state, action) => {
        // Roll the optimistic update back so the badge stays truthful.
        const id = action.meta.arg;
        const row = state.items.find((n) => n.id === id);
        if (row && row.isRead) {
          row.isRead = false;
          state.unread += 1;
        }
      })

      .addCase(markAllRead.fulfilled, (state) => {
        state.items = state.items.map((n) => ({ ...n, isRead: true }));
        state.unread = 0;
      });
  },
});

export const { clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;