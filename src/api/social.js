import { api } from './client';

// ---- Likes (songs) ----

// GET /me/likes/songs?page=&limit=
// -> { items: [song], pagination: { page, limit, total, totalPages } }
// `items` are the SAME song shape the browse endpoints return — deliberately, so
// a liked-songs grid can reuse the exact card the browse grid uses.
export function fetchLikedSongs({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/me/likes/songs?${params.toString()}`).then((res) => res.data);
}

// POST /me/likes/songs/:id -> { added: true, alreadyExisted: bool }
// Idempotent: liking twice is not an error, it just tells you it was already
// there. That matters because a double-click must not 500.
export function likeSong(songId) {
  return api(`/me/likes/songs/${songId}`, { method: 'POST' }).then((res) => res.data);
}

// DELETE /me/likes/songs/:id -> { removed: true, existed: bool }
export function unlikeSong(songId) {
  return api(`/me/likes/songs/${songId}`, { method: 'DELETE' }).then((res) => res.data);
}

// ---- Saves (songs) ----
// Save != like. A like is a signal ("this is good"); a save is a filing action
// ("put this in my library"). They're separate tables and separate buttons.

// GET /me/saved/songs?page=&limit= -> { items, pagination }
export function fetchSavedSongs({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/me/saved/songs?${params.toString()}`).then((res) => res.data);
}

// POST /me/saved/songs/:id -> { added, alreadyExisted }
export function saveSong(songId) {
  return api(`/me/saved/songs/${songId}`, { method: 'POST' }).then((res) => res.data);
}

// DELETE /me/saved/songs/:id -> { removed, existed }
export function unsaveSong(songId) {
  return api(`/me/saved/songs/${songId}`, { method: 'DELETE' }).then((res) => res.data);
}

// ---- Saves (albums) ----

// GET /me/saved/albums?page=&limit= -> { items, pagination }
export function fetchSavedAlbums({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/me/saved/albums?${params.toString()}`).then((res) => res.data);
}

// POST /me/saved/albums/:id -> { added, alreadyExisted }
export function saveAlbum(albumId) {
  return api(`/me/saved/albums/${albumId}`, { method: 'POST' }).then((res) => res.data);
}

// DELETE /me/saved/albums/:id -> { removed, existed }
export function unsaveAlbum(albumId) {
  return api(`/me/saved/albums/${albumId}`, { method: 'DELETE' }).then((res) => res.data);
}

// ---- Follows (artists) ----
// NOTE the id here is the ARTIST PROFILE id, not the user id. A user only has an
// artist profile if they became an artist; following is a relation to the profile,
// which is what owns the catalog. Passing a user id here will 404.

// GET /me/following?page=&limit=
// -> { items: [{ id, stageName, avatarUrl, username }], pagination }
// `username` is included so the card can link to /artist/:username.
export function fetchFollowedArtists({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/me/following?${params.toString()}`).then((res) => res.data);
}

// POST /me/following/:artistProfileId -> { added, alreadyExisted }
export function followArtist(artistProfileId) {
  return api(`/me/following/${artistProfileId}`, { method: 'POST' }).then((res) => res.data);
}

// DELETE /me/following/:artistProfileId -> { removed, existed }
export function unfollowArtist(artistProfileId) {
  return api(`/me/following/${artistProfileId}`, { method: 'DELETE' }).then((res) => res.data);
}

// GET /me/followers?page=&limit=
// -> { items: [{ userId, username, displayName, followedAt }], pagination }
// The MIRROR of fetchFollowedArtists: who follows ME. Only meaningful for artists —
// the backend returns 403 if the caller has no artist profile, so a listener calling
// this is a client bug, not an empty list. The items are USERS (your followers),
// not artist profiles, which is why the shape differs from fetchFollowedArtists.
export function fetchMyFollowers({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/me/followers?${params.toString()}`).then((res) => res.data);
}

// ---- Status ----
// "Is this liked/saved/followed BY ME?" — one call per entity, so a page paints
// all its buttons in a single round trip instead of one request per button.
//
// These exist because the browse payload deliberately does NOT carry per-user
// state. Browse is the same for everybody and can be cached; "did Khawla like
// this" is not. Mixing the two would make the catalog uncacheable per user.

// GET /me/status/song/:id -> { songId, liked, saved, likeCount }
export function fetchSongStatus(songId) {
  return api(`/me/status/song/${songId}`).then((res) => res.data);
}

// GET /me/status/album/:id -> { albumId, saved }
export function fetchAlbumStatus(albumId) {
  return api(`/me/status/album/${albumId}`).then((res) => res.data);
}

// GET /me/status/artist/:id -> { artistProfileId, following, followerCount }
export function fetchArtistStatus(artistProfileId) {
  return api(`/me/status/artist/${artistProfileId}`).then((res) => res.data);
}