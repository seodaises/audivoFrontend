import { api } from './client';

// GET /genres -> [{ id, name }]
export function fetchGenres() {
  return api('/genres').then((res) => res.data);
}

// POST /genres { name } — Admin + manage_catalog. 409 if the name already exists.
export function createGenre(name) {
  return api('/genres', { method: 'POST', body: { name } }).then((res) => res.data);
}

// GET /catalog/songs?page=&limit=&genre=
// -> { songs: [{ id, title, albumId, artist:{id,stageName}, durationSeconds,
//               genres:[{id,name}] }], pagination:{page,limit,total,totalPages} }
export function fetchSongs({ page = 1, limit = 20, genre } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (genre) params.set('genre', genre);
  return api(`/catalog/songs?${params.toString()}`).then((res) => res.data);
}

// GET /catalog/albums?page=&limit=&genre=
export function fetchAlbums({ page = 1, limit = 20, genre } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (genre) params.set('genre', genre);
  return api(`/catalog/albums?${params.toString()}`).then((res) => res.data);
}

// GET /catalog/artists?page=&limit=
export function fetchArtists({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/catalog/artists?${params.toString()}`).then((res) => res.data);
}

// GET /catalog/trending/songs?limit=
// -> { songs: [...], window: { days, since } }
export function fetchTrendingSongs({ limit = 10 } = {}) {
  return api(`/catalog/trending/songs?limit=${limit}`).then((res) => res.data);
}

// GET /catalog/trending/albums?limit=
// -> { albums: [...], window: { days, since } }
export function fetchTrendingAlbums({ limit = 10 } = {}) {
  return api(`/catalog/trending/albums?limit=${limit}`).then((res) => res.data);
}

// GET /catalog/trending/artists?limit=
// -> { artists: [...], window: { days, since } }
export function fetchTrendingArtists({ limit = 10 } = {}) {
  return api(`/catalog/trending/artists?limit=${limit}`).then((res) => res.data);
}

// GET /catalog/search?q= -> { query, songs, albums, artists }
export function searchCatalog(q) {
  const params = new URLSearchParams({ q });
  return api(`/catalog/search?${params.toString()}`).then((res) => res.data);
}

// GET /albums/:ref -> album detail with songs + artist.
export function fetchAlbum(albumRef) {
  return api(`/albums/${albumRef}`).then((res) => res.data);
}

// GET /catalog/songs/:publicId -> one published song, by its opaque public_id.
export function fetchSong(publicId) {
  return api(`/catalog/songs/${publicId}`).then((res) => res.data);
}

// GET /catalog/artists/:username -> the PUBLIC artist page (published only).
export function fetchArtistByUsername(username) {
  return api(`/catalog/artists/${encodeURIComponent(username)}`).then((res) => res.data);
}

// GET /artist/catalog -> the LOGGED-IN user's OWN catalog, ALL statuses
export function fetchMyCatalog() {
  return api('/artist/catalog').then((res) => res.data);
}

export function songFileUrl(songId) {
  return `http://localhost:5000/api/songs/${songId}/file`;
}


// POST /artist/profile { stageName, bio?, avatarUrl? }
export function createArtistProfile({ stageName, bio, avatarUrl }) {
  return api('/artist/profile', {
    method: 'POST',
    body: { stageName, bio, avatarUrl },
  }).then((res) => res.data);
}

// GET /artist/profile -> own profile (404 if none yet)
export function getMyArtistProfile() {
  return api('/artist/profile').then((res) => res.data);
}

// POST /albums { title, coverUrl?, releaseDate?, isSingle? }  (requires verified)
export function createAlbum({ title, coverUrl, description, releaseDate, isSingle }) {
  return api('/albums', {
    method: 'POST',
    body: { title, coverUrl, description, releaseDate, isSingle },
  }).then((res) => res.data);
}

// PATCH /albums/:id/status { status }
export function setAlbumStatus(albumId, status) {
  return api(`/albums/${albumId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}

// PATCH /albums/:id/schedule { releaseAt }
export function scheduleRelease(albumId, releaseAt) {
  return api(`/albums/${albumId}/schedule`, {
    method: 'PATCH',
    body: { releaseAt },
  }).then((res) => res.data);
}

// DELETE /albums/:id/schedule  — cancel a pending scheduled release (-> draft)
export function cancelSchedule(albumId) {
  return api(`/albums/${albumId}/schedule`, {
    method: 'DELETE',
  }).then((res) => res.data);
}

// PATCH /songs/:id/status { status }
export function setSongStatus(songId, status) {
  return api(`/songs/${songId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}

// DELETE /songs/:id — HARD delete. 
export function deleteSong(songId, password) {
  return api(`/songs/${songId}`, { method: 'DELETE', body: { password } }).then((res) => res.data);
}

// DELETE /albums/:id 
export function deleteAlbum(albumId, password) {
  return api(`/albums/${albumId}`, { method: 'DELETE', body: { password } }).then((res) => res.data);
}

// PATCH /albums/:id { coverUrl?, title?, releaseDate? } — edit album fields.
export function updateAlbum(albumId, patch) {
  return api(`/albums/${albumId}`, {
    method: 'PATCH',
    body: patch,
  }).then((res) => res.data);
}

// PATCH /songs/:id — edit an owned song's title (and optionally track number).
export function updateSong(songId, patch) {
  return api(`/songs/${songId}`, { method: 'PATCH', body: patch }).then((res) => res.data);
}

// PATCH /artist/profile — update MY artist profile (stage name, bio, avatar).
export function updateMyProfile(patch) {
  return api('/artist/profile', { method: 'PATCH', body: patch }).then((res) => res.data);
}

// GET /admin/catalog/artists?verified=true|false — list artist profiles.
export function adminListArtists({ verified, search, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (verified !== undefined) params.set('verified', String(verified));
  if (search) params.set('search', search);
  return api(`/admin/catalog/artists?${params.toString()}`).then((res) => res.data);
}

// PATCH /admin/catalog/artists/:id/verify { isVerified }
export function verifyArtist(artistProfileId, isVerified = true) {
  return api(`/admin/catalog/artists/${artistProfileId}/verify`, {
    method: 'PATCH',
    body: { isVerified },
  }).then((res) => res.data);
}

// GET /admin/catalog/songs?status=&search= — all songs, any owner/status.
export function adminListSongs({ status, search, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  return api(`/admin/catalog/songs?${params.toString()}`).then((res) => res.data);
}

// GET /admin/catalog/albums?status=&search= — all albums, any owner/status.
export function adminListAlbums({ status, search, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  return api(`/admin/catalog/albums?${params.toString()}`).then((res) => res.data);
}

// PATCH /admin/catalog/songs/:id/status { status } — admin force-set (bypasses ownership).
export function adminSetSongStatus(songId, status) {
  return api(`/admin/catalog/songs/${songId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}

// PATCH /admin/catalog/songs/bulk-status { ids, status } -> { requested, updated, status }
export function adminBulkSetSongStatus(ids, status) {
  return api('/admin/catalog/songs/bulk-status', {
    method: 'PATCH',
    body: { ids, status },
  }).then((res) => res.data);
}

// PATCH /admin/catalog/albums/:id/status { status } — admin force-set (bypasses ownership).
export function adminSetAlbumStatus(albumId, status) {
  return api(`/admin/catalog/albums/${albumId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}

// PATCH /admin/catalog/albums/bulk-status { ids, status } -> { requested, updated, status }
export function adminBulkSetAlbumStatus(ids, status) {
  return api('/admin/catalog/albums/bulk-status', {
    method: 'PATCH',
    body: { ids, status },
  }).then((res) => res.data);
}

// DELETE /admin/catalog/songs/:id — admin hard delete, any owner (bypasses ownership).
export function adminDeleteSong(songId) {
  return api(`/admin/catalog/songs/${songId}`, { method: 'DELETE' }).then((res) => res.data);
}

// DELETE /admin/catalog/albums/:id — admin hard delete, cascades to the album's songs.
export function adminDeleteAlbum(albumId) {
  return api(`/admin/catalog/albums/${albumId}`, { method: 'DELETE' }).then((res) => res.data);
}

// POST /songs — multipart upload. 
import axios from 'axios';

export function uploadSong({ title, albumId, trackNumber, durationSeconds, genreIds, file }) {
  const form = new FormData();
  form.append('audio', file);            // <-- multer field name
  form.append('title', title);
  form.append('albumId', albumId);
  if (trackNumber != null && trackNumber !== '') form.append('trackNumber', trackNumber);
  if (durationSeconds != null && durationSeconds !== '') form.append('durationSeconds', durationSeconds);
  // genreIds: the service accepts a CSV string or JSON; CSV is simplest here.
  if (Array.isArray(genreIds) && genreIds.length) form.append('genreIds', genreIds.join(','));

  return axios
    .post('http://localhost:5000/api/songs', form, {
      withCredentials: true,             // send the auth cookie
      // NOTE: deliberately NOT setting Content-Type — axios/browser sets the
      // multipart boundary automatically. Setting it by hand breaks the upload.
    })
    .then((res) => res.data.data);       // raw axios: unwrap HTTP -> envelope -> data
}