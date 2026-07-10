// All catalog/studio API calls in one place. Every page imports from here so
// that endpoint paths and payload shapes live in exactly one file — if the
// backend contract changes, this is the only place to edit.
//
// api() (from ./client) already unwraps the backend envelope to { success,
// message, data } and throws an Error(message) on failure. So each function
// here returns the `data` payload directly, and callers use try/catch.
import { api } from './client';

// ---- Reads (listener / browse) ----

// GET /genres -> [{ id, name }]
export function fetchGenres() {
  return api('/genres').then((res) => res.data);
}

// GET /catalog/songs?page=&limit=&genre=
// -> { songs: [{ id, title, albumId, artist:{id,stageName}, durationSeconds,
//               genres:[{id,name}] }], pagination:{page,limit,total,totalPages} }
export function fetchSongs({ page = 1, limit = 20, genre } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (genre) params.set('genre', genre);
  return api(`/catalog/songs?${params.toString()}`).then((res) => res.data);
}

// GET /catalog/albums?page=&limit=
export function fetchAlbums({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/catalog/albums?${params.toString()}`).then((res) => res.data);
}

// GET /catalog/artists?page=&limit=
export function fetchArtists({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/catalog/artists?${params.toString()}`).then((res) => res.data);
}

// GET /catalog/search?q= -> { query, songs, albums, artists }
export function searchCatalog(q) {
  const params = new URLSearchParams({ q });
  return api(`/catalog/search?${params.toString()}`).then((res) => res.data);
}

// ---- Detail reads (public/self pages) ----

// GET /albums/:id -> album detail with songs + artist.
// The backend returns published albums to anyone, and unpublished ones ONLY to
// the owning artist (it 404s otherwise). Shape:
// { id, title, coverUrl, status, isSingle, releaseDate,
//   artist:{ id, stageName, username }|null,
//   songs:[{ id, title, trackNumber, durationSeconds, status }] }
// Note artist.username — AlbumPage uses it to link to the artist page.
export function fetchAlbum(albumId) {
  return api(`/albums/${albumId}`).then((res) => res.data);
}

// GET /catalog/artists/:username -> the PUBLIC artist page (published only).
// Shape: { profile:{ id, stageName, bio, avatarUrl, isVerified, ... },
//          username, albums:[{ id, title, coverUrl, releaseDate, isSingle }],
//          songs:[{ id, title, albumId, trackNumber, durationSeconds }] }
// 404s if the username doesn't exist or the user isn't an artist.
export function fetchArtistByUsername(username) {
  return api(`/catalog/artists/${encodeURIComponent(username)}`).then((res) => res.data);
}

// GET /artist/catalog -> the LOGGED-IN user's OWN catalog, ALL statuses
// (drafts + archived + published) for the Library / self view. Non-artists get
// { isArtist:false, profile:null, albums:[], songs:[] } — not a 404. Shape:
// { isArtist, profile,
//   albums:[{ id, title, coverUrl, status, isSingle, releaseDate }],
//   songs:[{ id, title, albumId, status, trackNumber, durationSeconds,
//            coverUrl, artist:{id,stageName}, genres:[{id,name}] }] }
export function fetchMyCatalog() {
  return api('/artist/catalog').then((res) => res.data);
}

// The audio stream URL for a song. Not an api() call — this is a raw URL fed
// straight to an <audio> element's src. It hits the protected file-serve route;
// the auth cookie rides along because the <audio> tag uses
// crossOrigin="use-credentials" (see SongList). Clients address songs by ID,
// never by storage_key (which the browse payload never even exposes).
export function songFileUrl(songId) {
  return `http://localhost:5000/api/songs/${songId}/file`;
}

// ---- Writes (artist studio) ----

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

// PATCH /songs/:id/status { status }
export function setSongStatus(songId, status) {
  return api(`/songs/${songId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}

// PATCH /albums/:id { coverUrl?, title?, releaseDate? } — edit album fields.
// Used by the studio to attach a cover URL after (or instead of) creation.
export function updateAlbum(albumId, patch) {
  return api(`/albums/${albumId}`, {
    method: 'PATCH',
    body: patch,
  }).then((res) => res.data);
}

// PATCH /songs/:id — edit an owned song's title (and optionally track number).
// Owner-gated on the backend. patch = { title?, trackNumber?, durationSeconds? }.
export function updateSong(songId, patch) {
  return api(`/songs/${songId}`, { method: 'PATCH', body: patch }).then((res) => res.data);
}

// PATCH /artist/profile — update MY artist profile (stage name, bio, avatar).
// Goes through requireOwnProfile on the backend. patch = { stageName?, bio?, avatarUrl? }.
export function updateMyProfile(patch) {
  return api('/artist/profile', { method: 'PATCH', body: patch }).then((res) => res.data);
}
// ---- Admin catalog (manage_catalog permission) ----

// GET /admin/catalog/artists?verified=true|false — list artist profiles.
// Omit `verified` for all; pass false for the approval queue.
export function adminListArtists({ verified, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (verified !== undefined) params.set('verified', String(verified));
  return api(`/admin/catalog/artists?${params.toString()}`).then((res) => res.data);
}

// PATCH /admin/catalog/artists/:id/verify { isVerified }
export function verifyArtist(artistProfileId, isVerified = true) {
  return api(`/admin/catalog/artists/${artistProfileId}/verify`, {
    method: 'PATCH',
    body: { isVerified },
  }).then((res) => res.data);
}

// GET /admin/catalog/songs?status= — all songs, any owner/status.
export function adminListSongs({ status, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  return api(`/admin/catalog/songs?${params.toString()}`).then((res) => res.data);
}

// GET /admin/catalog/albums?status= — all albums, any owner/status.
export function adminListAlbums({ status, page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  if (status) params.set('status', status);
  return api(`/admin/catalog/albums?${params.toString()}`).then((res) => res.data);
}

// PATCH /admin/catalog/songs/:id/status { status } — admin force-set (bypasses ownership).
export function adminSetSongStatus(songId, status) {
  return api(`/admin/catalog/songs/${songId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}

// PATCH /admin/catalog/albums/:id/status { status } — admin force-set (bypasses ownership).
export function adminSetAlbumStatus(albumId, status) {
  return api(`/admin/catalog/albums/${albumId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}
// POST /songs — multipart upload. This CANNOT use api()/http, because those
// set Content-Type: application/json. For a file we must let the browser set
// Content-Type to multipart/form-data itself (with the boundary string), so we
// use a bare axios call with withCredentials for the auth cookie. Field name
// is 'audio' — it MUST match multer's upload.single('audio') on the backend.
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