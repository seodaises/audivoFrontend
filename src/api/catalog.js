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
export function createAlbum({ title, coverUrl, releaseDate, isSingle }) {
  return api('/albums', {
    method: 'POST',
    body: { title, coverUrl, releaseDate, isSingle },
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