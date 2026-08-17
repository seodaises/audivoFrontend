import { api } from './client';

// ---- Playlists ----

// POST /playlists { title, description?, isPublic? } -> the created playlist
export function createPlaylist({ title, description, isPublic = false }) {
  return api('/playlists', {
    method: 'POST',
    body: { title, description, isPublic },
  }).then((res) => res.data);
}

// GET /playlists?page=&limit=&songId= -> { items, pagination }  — MY playlists only.
export function fetchMyPlaylists({ page = 1, limit = 50, songId } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (songId != null) params.set('songId', songId);
  return api(`/playlists?${params.toString()}`).then((res) => res.data);
}

// GET /playlists/public?page=&limit=&search= -> { items, pagination }
export function fetchPublicPlaylists({ page = 1, limit = 50, search = '' } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set('search', search);
  return api(`/playlists/public?${params.toString()}`).then((res) => res.data);
}

// GET /playlists/:id?page=&limit= -> the playlist plus its paginated tracks.
export function fetchPlaylist(playlistId, { page = 1, limit = 100 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/playlists/${playlistId}?${params.toString()}`).then((res) => res.data);
}

// PATCH /playlists/:id { title?, description?, isPublic? } — owner only.
export function updatePlaylist(playlistId, patch) {
  return api(`/playlists/${playlistId}`, { method: 'PATCH', body: patch }).then((res) => res.data);
}

// DELETE /playlists/:id — owner only. Removes the playlist and its track rows.
export function deletePlaylist(playlistId) {
  return api(`/playlists/${playlistId}`, { method: 'DELETE' }).then((res) => res.data);
}

// POST /playlists/:id/tracks { songId, afterPlaylistSongId? }
export function addTrack(playlistId, songId, afterPlaylistSongId = undefined) {
  const body = { songId };
  if (afterPlaylistSongId != null) body.afterPlaylistSongId = afterPlaylistSongId;
  return api(`/playlists/${playlistId}/tracks`, { method: 'POST', body }).then((res) => res.data);
}

// DELETE /playlists/:id/tracks/:trackId
export function removeTrack(playlistId, playlistSongId) {
  return api(`/playlists/${playlistId}/tracks/${playlistSongId}`, {
    method: 'DELETE',
  }).then((res) => res.data);
}

// PATCH /playlists/:id/tracks/:trackId/move { afterPlaylistSongId }
export function moveTrack(playlistId, playlistSongId, afterPlaylistSongId = null) {
  return api(`/playlists/${playlistId}/tracks/${playlistSongId}/move`, {
    method: 'PATCH',
    body: { afterPlaylistSongId },
  }).then((res) => res.data);
}