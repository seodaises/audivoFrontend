import { createSlice } from '@reduxjs/toolkit';

export const REPEAT_MODES = ['off', 'all', 'one'];

const initialState = {
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

  // ── Repeat / shuffle ───────────────────────────────────────────────────────
  repeat: 'off',   // one of REPEAT_MODES
  shuffle: false,

  order: [],       // e.g. [3, 0, 2, 1] — queue indices in shuffled play order
  orderPos: -1,    // position within `order`, or -1

  focused: false,  // full-viewport focused player overlay
  pip: false,      // floating draggable/resizable picture-in-picture card
};

const shuffledIndices = (n, firstIndex) => {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (firstIndex != null && firstIndex >= 0) {
    const at = arr.indexOf(firstIndex);
    if (at > 0) [arr[0], arr[at]] = [arr[at], arr[0]];
  }
  return arr;
};

// Rebuild `order`/`orderPos` from the current queue, shuffle flag, and the index
// we want to be sitting on. Centralised so every entry point agrees on it.
const rebuildOrder = (state, currentIndex) => {
  if (state.shuffle) {
    state.order = shuffledIndices(state.queue.length, currentIndex);
    state.orderPos = state.order.indexOf(currentIndex);
  } else {
    // Identity order: play position == queue position.
    state.order = state.queue.map((_, i) => i);
    state.orderPos = currentIndex;
  }
};

// Given a queue index, load it as `current` and sync orderPos to match.
const loadAt = (state, queue, index) => {
  state.queue = queue;
  state.index = index;
  state.current = queue[index] ?? null;
  state.isPlaying = Boolean(state.current);
  state.progress = 0;
  state.duration = 0;
  state.orderPos = state.order.indexOf(index);
};

const advance = (state, { auto }) => {
  if (state.index < 0) return;

  // repeat-one: an auto-ended track replays itself. A MANUAL next ignores this
  // and skips forward — you asked to move, so you move.
  if (auto && state.repeat === 'one') {
    state.progress = 0;
    state.seekTo = 0;
    state.isPlaying = true;
    return;
  }

  const currentIndex = state.index;
  const nextQueueIndex = state.order[state.orderPos + 1];

  if (state.orderPos >= state.order.length - 1) {
    if (state.repeat === 'all') {
      const firstQueueIndex = state.order[0];
      const trimmedQueue = state.queue.filter((_, idx) => idx !== currentIndex);
      const adjustedIndex = firstQueueIndex > currentIndex ? firstQueueIndex - 1 : firstQueueIndex;
      state.queue = trimmedQueue;
      if (trimmedQueue.length > 0) {
        rebuildOrder(state, adjustedIndex);
        loadAt(state, trimmedQueue, adjustedIndex);
      } else {
        state.current = null;
        state.index = -1;
        state.isPlaying = false;
        state.progress = 0;
        state.order = [];
        state.orderPos = -1;
      }
    } else {
      const trimmedQueue = state.queue.filter((_, idx) => idx !== currentIndex);
      state.queue = trimmedQueue;
      state.isPlaying = false;
      state.progress = 0;
      state.index = -1;
      state.current = trimmedQueue[0] ?? null;
      state.order = [];
      state.orderPos = -1;
    }
    return;
  }

  const trimmedQueue = state.queue.filter((_, idx) => idx !== currentIndex);
  const adjustedNextIndex = nextQueueIndex > currentIndex ? nextQueueIndex - 1 : nextQueueIndex;
  state.queue = trimmedQueue;
  if (trimmedQueue.length === 0) {
    state.current = null;
    state.index = -1;
    state.isPlaying = false;
    state.progress = 0;
    state.order = [];
    state.orderPos = -1;
    return;
  }
  rebuildOrder(state, adjustedNextIndex);
  loadAt(state, trimmedQueue, adjustedNextIndex);
};

const playerSlice = createSlice({
  name: 'player',
  initialState,
  reducers: {
    restorePlayback(state, action) {
      const { track, progress = 0, isPlaying = false } = action.payload || {};
      if (!track?.id) return;
      if (state.current && String(state.current.id) !== String(track.id)) return;
      state.queue = [track];
      state.index = 0;
      state.current = track;
      state.isPlaying = Boolean(isPlaying);
      state.progress = Number(progress) || 0;
      state.duration = 0;
      rebuildOrder(state, 0);
    },

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
      rebuildOrder(state, 0);
    },

    enqueueTrack(state, action) {
      const track = action.payload;
      if (!track?.id) return;
      const nextQueue = [...state.queue];
      nextQueue.push(track);
      state.queue = nextQueue;
      rebuildOrder(state, state.index < 0 ? 0 : state.index);
      if (!state.current) {
        state.current = track;
        state.index = 0;
        state.isPlaying = true;
        state.progress = 0;
        state.duration = 0;
      }
    },

    reorderQueue(state, action) {
      const { fromIndex, toIndex } = action.payload || {};
      if (!Number.isInteger(fromIndex) || !Number.isInteger(toIndex)) return;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || toIndex < 0 || fromIndex >= state.queue.length || toIndex >= state.queue.length) return;
      const nextQueue = [...state.queue];
      const [moved] = nextQueue.splice(fromIndex, 1);
      nextQueue.splice(toIndex, 0, moved);
      state.queue = nextQueue;
      const currentId = state.current?.id;
      const currentIndex = nextQueue.findIndex((item) => String(item.id) === String(currentId));
      if (currentIndex >= 0) {
        state.index = currentIndex;
        state.current = nextQueue[currentIndex] ?? null;
        rebuildOrder(state, currentIndex);
      } else {
        rebuildOrder(state, state.index < 0 ? 0 : state.index);
      }
    },

    removeFromQueue(state, action) {
      const index = action.payload;
      if (!Number.isInteger(index) || index < 0 || index >= state.queue.length) return;
      const currentId = state.current?.id;
      const currentIndex = state.queue.findIndex((item) => String(item.id) === String(currentId));
      if (currentIndex >= 0 && index === currentIndex) return;
      const nextQueue = state.queue.filter((_, itemIndex) => itemIndex !== index);
      state.queue = nextQueue;
      if (currentIndex >= 0 && index < currentIndex) {
        state.index = currentIndex - 1;
      } else if (currentIndex >= 0 && index === currentIndex) {
        state.index = currentIndex;
      } else {
        state.index = state.index < 0 ? -1 : state.index;
      }
      rebuildOrder(state, state.index < 0 ? 0 : state.index);
    },

    clearQueue(state) {
      if (!state.current) {
        state.queue = [];
        state.index = -1;
        state.order = [];
        state.orderPos = -1;
        return;
      }
      state.queue = [state.current];
      state.index = 0;
      rebuildOrder(state, 0);
    },

    playFromQueue(state, action) {
      const { queue, index } = action.payload;
      if (!Array.isArray(queue) || index < 0 || index >= queue.length) return;
      state.queue = queue;
      // Build the play order BEFORE loadAt, so loadAt can find its orderPos.
      rebuildOrder(state, index);
      loadAt(state, queue, index);
    },

    // Advance to the next track. Manual: repeat-one does NOT replay here.
    next(state) {
      advance(state, { auto: false });
    },

    // Go to the previous track. If we're more than 3 seconds into the current
    // track, "prev" restarts the current track instead (matches Spotify).
    prev(state) {
      if (state.progress > 3) {
        state.progress = 0;
        state.seekTo = 0;
        return;
      }
      if (state.orderPos <= 0) {
        // At the first track in play order: restart it rather than doing nothing.
        // (Under repeat-all you could argue for wrapping to the end; restart is
        // the less surprising choice and matches most players.)
        state.progress = 0;
        state.seekTo = 0;
        return;
      }
      const prevQueueIndex = state.order[state.orderPos - 1];
      loadAt(state, state.queue, prevQueueIndex);
    },

    pause(state) { state.isPlaying = false; },
    resume(state) { if (state.current) state.isPlaying = true; },
    togglePlay(state) { if (state.current) state.isPlaying = !state.isPlaying; },

    // Cycle repeat off -> all -> one -> off.
    cycleRepeat(state) {
      const i = REPEAT_MODES.indexOf(state.repeat);
      state.repeat = REPEAT_MODES[(i + 1) % REPEAT_MODES.length];
    },

    // Toggle shuffle and rebuild the play order around the current track, so the
    // track you're on stays put and everything else reshuffles (or unshuffles).
    toggleShuffle(state) {
      state.shuffle = !state.shuffle;
      rebuildOrder(state, state.index < 0 ? 0 : state.index);
    },

    // Provider reports playback position/length back into the store.
    setProgress(state, action) { state.progress = action.payload; },
    setDuration(state, action) { state.duration = action.payload; },

    // Bar requests a seek; provider consumes it and calls clearSeek.
    requestSeek(state, action) { state.seekTo = action.payload; },
    clearSeek(state) { state.seekTo = null; },

    // Track ended on its own: honour repeat-one/all via the shared advance step.
    ended(state) {
      advance(state, { auto: true });
    },

    openFocused(state) { state.focused = true; state.pip = false; },
    closeFocused(state) { state.focused = false; },
    toggleFocused(state) { state.focused = !state.focused; if (state.focused) state.pip = false; },
    openPip(state) { state.pip = true; state.focused = false; },
    closePip(state) { state.pip = false; },
    togglePip(state) { state.pip = !state.pip; if (state.pip) state.focused = false; },

    // Full teardown — used on logout so audio stops and the bar disappears.
    reset() {
      return initialState;
    },
  },
});

export const {
  restorePlayback,
  playTrack, playFromQueue, enqueueTrack, reorderQueue, removeFromQueue, clearQueue, next, prev,
  pause, resume, togglePlay,
  cycleRepeat, toggleShuffle,
  setProgress, setDuration, requestSeek, clearSeek, ended, reset,
  openFocused, closeFocused, toggleFocused, openPip, closePip, togglePip,
} = playerSlice.actions;

export default playerSlice.reducer;