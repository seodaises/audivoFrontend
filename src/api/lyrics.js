import { api } from './client';

// GET /songs/:id/lyrics/public -> { songId, available, syncedLyrics, source }
export function fetchPublicLyrics(songId) {
  return api(`/songs/${songId}/lyrics/public`).then((res) => res.data);
}

// POST /songs/:id/lyrics/generate -> { songId, status } (artist, own songs only)
export function generateLyrics(songId) {
  return api(`/songs/${songId}/lyrics/generate`, { method: 'POST' }).then((res) => res.data);
}

// GET /songs/:id/lyrics -> { songId, status, rawText, syncedLyrics, source, errorMessage }
// Owner-only status/result check — used for the My Catalog action button.
export function fetchOwnedLyrics(songId) {
  return api(`/songs/${songId}/lyrics`).then((res) => res.data);
}

// PATCH /songs/:id/lyrics -> { songId, status, source, syncedLyrics }
// Artist correcting AI transcription mistakes — text only, timestamps are
// echoed back as given (see lyricsService.updateLyrics for why).
export function updateLyrics(songId, lines) {
  return api(`/songs/${songId}/lyrics`, { method: 'PATCH', body: { lines } }).then((res) => res.data);
}