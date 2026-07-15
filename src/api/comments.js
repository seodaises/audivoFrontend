import { api } from './client';

// ---- Reading + posting ----

// GET /songs/:id/comments?page=&limit= -> { items, pagination }
// Returns VISIBLE comments only for ordinary users. Threading is by
// parentCommentId — a null parent is a top-level comment, a set parent is a reply.
export function fetchComments(songId, { page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/songs/${songId}/comments?${params.toString()}`).then((res) => res.data);
}

// POST /songs/:id/comments { body, parentCommentId? }
// Omit parentCommentId for a top-level comment; pass one to reply to it.
export function postComment(songId, body, parentCommentId = undefined) {
  const payload = { body };
  if (parentCommentId != null) payload.parentCommentId = parentCommentId;
  return api(`/songs/${songId}/comments`, { method: 'POST', body: payload }).then((res) => res.data);
}

// DELETE /comments/:id — the AUTHOR withdrawing their OWN comment.
//
// This is NOT a moderation action and needs no permission. Ownership is checked
// in the service ("is this row yours?"), which is the only layer that can answer
// it — a middleware can't know who wrote a row it hasn't fetched.
export function deleteComment(commentId) {
  return api(`/comments/${commentId}`, { method: 'DELETE' }).then((res) => res.data);
}

// ---- Moderation (moderate_comments permission) ----

// PATCH /comments/:id/status { status: 'visible' | 'hidden' }
//
// Hiding is REVERSIBLE and preserves the row — that's the whole design. A hard
// delete would destroy the evidence, and a moderator who hides the wrong comment
// needs a way back. Restoring is the same call with 'visible'.
export function setCommentStatus(commentId, status) {
  return api(`/comments/${commentId}/status`, {
    method: 'PATCH',
    body: { status },
  }).then((res) => res.data);
}

// GET /comments/hidden?page=&limit= -> the moderation queue.
//
// Declared BEFORE /:id on the backend router on purpose: Express matches
// top-down, so if '/:id' came first, the literal '/hidden' would be swallowed as
// an id and blow up on Number('hidden'). Worth knowing if you ever add routes here.
export function fetchHiddenComments({ page = 1, limit = 50 } = {}) {
  const params = new URLSearchParams({ page, limit });
  return api(`/comments/hidden?${params.toString()}`).then((res) => res.data);
}

// ---- Plays ----

// The ENUM on play_history.source. MySQL rejects anything outside this list, and
// the backend validates it too — a bad value returns a clean 400 rather than a
// 500 that looks like a server bug. Exported so callers can't typo a string.
export const PLAY_SOURCES = ['browse', 'album', 'playlist', 'queue', 'search', 'artist'];

// POST /songs/:id/play { msPlayed?, source? } -> { songId, playCount }
//
// Fires ONCE per track load (see PlayerProvider). msPlayed is optional and we
// don't send it — we call at play-START, before we know how long they listened.
// The column is nullable precisely for that reason.
//
// Why call at start and not at end: if you only counted completed listens, you'd
// record nothing for a skip, and skips ARE data. play_history keeps the raw event;
// a "was that a real listen?" rule (Spotify's is ~30s) can be applied later
// against the history table without having lost the rows in the first place.
// play_count on songs is just a denormalized cache of that history.
//
// Deliberately swallows its own failure at the call site — a failed analytics
// write must never interrupt playback. The music is the product; the counter isn't.
export function recordPlay(songId, { msPlayed, source = 'browse' } = {}) {
  const body = { source };
  if (msPlayed != null) body.msPlayed = msPlayed;
  return api(`/songs/${songId}/play`, { method: 'POST', body }).then((res) => res.data);
}