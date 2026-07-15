import { api } from './client';

// ---- Playlists ----

// POST /playlists { title, description?, isPublic? } -> the created playlist
export function createPlaylist({ title, description, isPublic = false }) {
  return api('/playlists', {
    method: 'POST',
    body: { title, description, isPublic },
  }).then((res) => res.data);
}

// GET /playlists?page=&limit= -> { items, pagination }  — MY playlists only.
export function fetchMyPlaylists({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/playlists?${params.toString()}`).then((res) => res.data);
}

// GET /playlists/public?page=&limit=&search= -> { items, pagination }
// Discovery feed: ALL public playlists from anyone, searchable by title. Each
// item carries `owner` (whose it is) and `isMine` (so the UI can tag your own).
export function fetchPublicPlaylists({ page = 1, limit = 50, search = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  return api(`/playlists/public?${params.toString()}`).then((res) => res.data);
}

// GET /playlists/:id?page=&limit= -> the playlist plus its paginated tracks.
//
// Readable if it's YOURS or it's PUBLIC. Note: public does NOT mean editable —
// anyone can read a public playlist, only the owner can write to it. The backend
// enforces that separately, so don't infer "I can edit" from "I could read".
//
// Each track carries BOTH ids: the playlist_songs row id AND the nested song.
// Pass the row id to remove/move; pass the nested song to the player.
export function fetchPlaylist(playlistId, { page = 1, limit = 100 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/playlists/${playlistId}?${params.toString()}`).then((res) => res.data);
}

// PATCH /playlists/:id { title?, description?, isPublic? } — owner only.
export function updatePlaylist(playlistId, patch) {
  return api(`/playlists/${playlistId}`, { method: 'PATCH', body: patch }).then((res) => res.data);
}

// DELETE /playlists/:id — owner only. Removes the playlist and its track rows.
// It does NOT delete the songs themselves — a playlist is a list of pointers,
// not a container. Deleting your "Gym" playlist must not delete the music.
export function deletePlaylist(playlistId) {
  return api(`/playlists/${playlistId}`, { method: 'DELETE' }).then((res) => res.data);
}

// ---- Tracks ----

// POST /playlists/:id/tracks { songId, afterPlaylistSongId? }
//
// Omit afterPlaylistSongId to APPEND to the end (the common case — "add to
// playlist" from a card). Pass a track id to insert directly AFTER that row.
//
// Ordering uses fractional positions on the backend: inserting between two rows
// computes a position halfway between them, so no other row has to be rewritten.
// That's why we say "after WHICH row" instead of "at index N" — an index would
// force renumbering every row below it on every single insert.
export function addTrack(playlistId, songId, afterPlaylistSongId = undefined) {
  const body = { songId };
  if (afterPlaylistSongId != null) body.afterPlaylistSongId = afterPlaylistSongId;
  return api(`/playlists/${playlistId}/tracks`, { method: 'POST', body }).then((res) => res.data);
}

// DELETE /playlists/:id/tracks/:trackId
// trackId = the PLAYLIST_SONGS ROW ID (from the track object), NOT the song id.
export function removeTrack(playlistId, playlistSongId) {
  return api(`/playlists/${playlistId}/tracks/${playlistSongId}`, {
    method: 'DELETE',
  }).then((res) => res.data);
}

// PATCH /playlists/:id/tracks/:trackId/move { afterPlaylistSongId }
//
// Move a track to sit directly after another one. Pass null (or omit) to move it
// to the FRONT of the playlist — "after nothing" is the natural way to say "first".
// This is the endpoint a drag-and-drop reorder calls on drop.
export function moveTrack(playlistId, playlistSongId, afterPlaylistSongId = null) {
  return api(`/playlists/${playlistId}/tracks/${playlistSongId}/move`, {
    method: 'PATCH',
    body: { afterPlaylistSongId },
  }).then((res) => res.data);
}