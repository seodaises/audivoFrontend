import { createSlice } from '@reduxjs/toolkit';

// Pure slice — no localStorage here. redux-persist (configured in store.js)
// saves and restores this slice automatically across refreshes.
//
// This slice owns CHROME PREFERENCES: how the shell is arranged, not what is in
// it. `playbarHidden` belongs here rather than in playerSlice for that reason —
// it is a view preference ("I don't want to see the bar"), not playback state.
// The audio keeps playing while hidden; playerSlice never learns about this.
// It's also why persisting it is correct: your chrome layout should survive a
// refresh, whereas the queue deliberately does not.
const sidebarSlice = createSlice({
  name: 'sidebar',
  initialState: {
    sidebarHidden: false,  // default; redux-persist overrides on load
    playbarHidden: false,
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarHidden = !state.sidebarHidden;
    },
    setSidebarHidden: (state, action) => {
      state.sidebarHidden = !!action.payload;
    },
    togglePlaybar: (state) => {
      state.playbarHidden = !state.playbarHidden;
    },
    setPlaybarHidden: (state, action) => {
      state.playbarHidden = !!action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarHidden,
  togglePlaybar,
  setPlaybarHidden,
} = sidebarSlice.actions;
export default sidebarSlice.reducer;