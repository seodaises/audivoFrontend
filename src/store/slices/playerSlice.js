import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  current: null,   // { id, title, artist } of the loaded track, or null
  isPlaying: false,
  // Progress is written by the provider from the audio element's timeupdate.
  progress: 0,     // seconds elapsed
  duration: 0,     // seconds total (from the file's metadata)
  // A monotonically increasing "seek request". The bar sets this; the provider
  // watches it and seeks the audio element. A counter (not a bare number) makes
  // "seek to the same spot twice" still register as a new request.
  seekTo: null,    // seconds to jump to, or null
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // Load a new track and start it. If it's the same track already loaded,
    // this still restarts intent — the provider decides play vs resume.
    playTrack(state, action) {
      state.current = action.payload; // { id, title, artist }
      state.isPlaying = true;
    },
    pause(state) { state.isPlaying = false; },
    resume(state) { if (state.current) state.isPlaying = true; },
    togglePlay(state) { if (state.current) state.isPlaying = !state.isPlaying; },
    // Provider reports playback position/length back into the store.
    setProgress(state, action) { state.progress = action.payload; },
    setDuration(state, action) { state.duration = action.payload; },
    // Bar requests a seek; provider consumes it and calls clearSeek.
    requestSeek(state, action) { state.seekTo = action.payload; },
    clearSeek(state) { state.seekTo = null; },
    // Track ended: keep it loaded (so the bar still shows it) but stopped.
    ended(state) { state.isPlaying = false; state.progress = 0; },
  },
});

export const {
  playTrack, pause, resume, togglePlay,
  setProgress, setDuration, requestSeek, clearSeek, ended,
} = playerSlice.actions;

export default playerSlice.reducer;