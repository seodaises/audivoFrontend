import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // The playback queue: the list of tracks the player can walk with next/prev.
  // Browse (or any view) hands the player the list it's showing; the player
  // remembers it so skip/prev have somewhere to go. Each entry is the light
  // shape the bar needs: { id, title, artist, coverUrl }.
  queue: [],
  index: -1,       // position of `current` within queue, or -1 if none
  current: null,   // { id, title, artist, coverUrl } of the loaded track, or null
  isPlaying: false,
  // Progress is written by the provider from the audio element's timeupdate.
  progress: 0,     // seconds elapsed
  duration: 0,     // seconds total (from the file's metadata)
  // A "seek request". The bar sets this; the provider watches it and seeks the
  // audio element, then clears it.
  seekTo: null,    // seconds to jump to, or null
};

// Given a queue and an index, produce the derived "now playing" fields.
const loadAt = (state, queue, index) => {
  state.queue = queue;
  state.index = index;
  state.current = queue[index] ?? null;
  state.isPlaying = Boolean(state.current);
  state.progress = 0;
  state.duration = 0;
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    // Play a single track with NO queue context (e.g. from a one-off card).
    // next/prev will have nowhere to go, which is fine.
    playTrack(state, action) {
      const track = action.payload; // { id, title, artist, coverUrl }
      state.queue = [track];
      state.index = 0;
      state.current = track;
      state.isPlaying = true;
      state.progress = 0;
      state.duration = 0;
    },

    // Play from a LIST: the view hands over its visible tracks plus the index
    // of the one clicked. This is what makes skip/prev meaningful — the queue
    // is "whatever view you started playback from".
    playFromQueue(state, action) {
      const { queue, index } = action.payload;
      if (!Array.isArray(queue) || index < 0 || index >= queue.length) return;
      loadAt(state, queue, index);
    },

    // Advance to the next track in the queue, if there is one. Wrapping is
    // deliberately OFF — at the end of the queue we simply stop.
    next(state) {
      if (state.index < 0 || state.index >= state.queue.length - 1) {
        state.isPlaying = false;
        return;
      }
      loadAt(state, state.queue, state.index + 1);
    },

    // Go to the previous track. If we're more than 3 seconds into the current
    // track, "prev" restarts the current track instead (matches Spotify).
    prev(state) {
      if (state.progress > 3) {
        state.progress = 0;
        state.seekTo = 0;
        return;
      }
      if (state.index <= 0) {
        // At the first track: restart it rather than doing nothing.
        state.progress = 0;
        state.seekTo = 0;
        return;
      }
      loadAt(state, state.queue, state.index - 1);
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

    // Track ended: auto-advance to the next track if the queue has one,
    // otherwise stop but keep the track loaded so the bar still shows it.
    ended(state) {
      if (state.index >= 0 && state.index < state.queue.length - 1) {
        loadAt(state, state.queue, state.index + 1);
      } else {
        state.isPlaying = false;
        state.progress = 0;
      }
    },

    // Full teardown — used on logout so audio stops and the bar disappears.
    reset() {
      return initialState;
    },
  },
});

export const {
  playTrack, playFromQueue, next, prev,
  pause, resume, togglePlay,
  setProgress, setDuration, requestSeek, clearSeek, ended, reset,
} = playerSlice.actions;

export default playerSlice.reducer;