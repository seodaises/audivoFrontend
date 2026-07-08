import { createSlice } from '@reduxjs/toolkit';

// Pure slice — no localStorage here. redux-persist (configured in store.js)
// saves and restores this slice automatically across refreshes.
const colorModeSlice = createSlice({
  name: 'colorMode',
  initialState: {
    mode: 'dark', // default; redux-persist overrides with the saved value on load
  },
  reducers: {
    toggleColorMode: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
    setColorMode: (state, action) => {
      state.mode = action.payload;
    },
  },
});

export const { toggleColorMode, setColorMode } = colorModeSlice.actions;
export default colorModeSlice.reducer;

