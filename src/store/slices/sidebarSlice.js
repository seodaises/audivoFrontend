import { createSlice } from '@reduxjs/toolkit';

// Pure slice — no localStorage here. redux-persist (configured in store.js)
// saves and restores this slice automatically across refreshes.
const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: {
    sidebarHidden: false, // default; redux-persist overrides on load
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarHidden = !state.sidebarHidden;
    },
    setSidebarHidden: (state, action) => {
      state.sidebarHidden = !!action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarHidden } = sidebarSlice.actions;
export default sidebarSlice.reducer;

