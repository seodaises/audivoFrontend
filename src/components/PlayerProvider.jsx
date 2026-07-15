import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setProgress, setDuration, ended, clearSeek } from '../store/slices/playerSlice';
import { songFileUrl } from '../api/catalog';
import { recordPlay } from '../api/comments';

// How long a track must actually play before it counts as a real listen.
// Spotify's threshold is ~30s: below this it's a skip, not a play. We keep the
// raw event out of the count entirely until the bar is crossed.
const PLAY_THRESHOLD_SECS = 30;

// Where "resume where you left off" remembers its position. A single localStorage
// key holding { songId, seconds }. Deliberately NOT wired into redux-persist —
// this codebase keeps auth and playback OUT of persistence on purpose; resume is
// a narrow, self-contained bit of state that doesn't belong in the store at all.
const RESUME_KEY = 'audivo.player.resume';

const readResume = () => {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.songId !== 'undefined' && typeof parsed.seconds === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const writeResume = (songId, seconds) => {
  try {
    localStorage.setItem(RESUME_KEY, JSON.stringify({ songId, seconds }));
  } catch {
    // Storage full or blocked (private mode). Resume is a nicety, not load-bearing.
  }
};

export default function PlayerProvider({ children }) {
  const dispatch = useDispatch();
  const { current, isPlaying, seekTo, progress } = useSelector((s) => s.player);
  const audioRef = useRef(null);

  // Marks the song id we've already counted a play for, so recordPlay fires at
  // most once per load even though the 30s effect runs on every timeupdate.
  const reportedIdRef = useRef(null);

  // Set true once we've applied a saved resume position for the current load, so
  // we don't fight the user every time they seek.
  const resumeAppliedRef = useRef(false);

  const loadedIdRef = useRef(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      // Player was reset (e.g. logout): stop and detach the source so audio
      // truly stops instead of lingering.
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      loadedIdRef.current = null;
      // Clear the report marker too. If the same song is played again after a
      // logout/reset, that is genuinely a NEW play and must be counted again.
      reportedIdRef.current = null;
      resumeAppliedRef.current = false;
      return;
    }
    if (loadedIdRef.current !== current.id) {
      audio.src = songFileUrl(current.id);
      loadedIdRef.current = current.id;
      // A fresh track: neither counted nor resumed yet.
      reportedIdRef.current = null;
      resumeAppliedRef.current = false;
    }
  }, [current]);

  // ── Resume where you left off ──────────────────────────────────────────────
  // When THIS song matches the last-saved resume point, jump to that position
  // once the file's metadata is known (so currentTime is settable). Applied a
  // single time per load; after that the user's own seeking wins.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (resumeAppliedRef.current) return;

    const saved = readResume();
    if (!saved || String(saved.songId) !== String(current.id)) {
      resumeAppliedRef.current = true; // nothing to resume for this track
      return;
    }

    const apply = () => {
      // Guard against seeking past the end (e.g. saved near the finish).
      const target = Math.min(saved.seconds, Math.max((audio.duration || 0) - 1, 0));
      if (target > 0) audio.currentTime = target;
      resumeAppliedRef.current = true;
    };

    if (audio.readyState >= 1 /* HAVE_METADATA */) apply();
    else audio.addEventListener('loadedmetadata', apply, { once: true });

    return () => audio.removeEventListener('loadedmetadata', apply);
  }, [current]);

  // ── The 30-second play rule ────────────────────────────────────────────────
  // recordPlay used to fire the instant a track loaded, which counted a 1-second
  // skip as a play. Now it fires only once playback has actually crossed the
  // threshold — or reached the end of a track SHORTER than the threshold, which
  // is still a complete listen.
  useEffect(() => {
    if (!current) return;
    if (reportedIdRef.current === current.id) return;

    const dur = audioRef.current?.duration || 0;
    const shortTrack = dur > 0 && dur < PLAY_THRESHOLD_SECS;
    const crossed = progress >= PLAY_THRESHOLD_SECS || (shortTrack && progress >= dur - 0.5);

    if (crossed) {
      reportedIdRef.current = current.id;
      recordPlay(current.id, { source: current.source || 'browse' }).catch(() => {});
    }
  }, [current, progress]);

  // Play/pause the element to match isPlaying. play() returns a promise that
  // rejects if the browser blocks autoplay or the file 401s — swallow it so a
  // failed play doesn't crash React.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, current]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTo == null) return;
    audio.currentTime = seekTo;
    if (isPlaying) audio.play().catch(() => {});
    dispatch(clearSeek());
  }, [seekTo, isPlaying, dispatch]);

  // Persist the current position so a reload can resume it. Written from the
  // store's progress (whole seconds) — cheap, and one key overwritten in place.
  useEffect(() => {
    if (!current || !isPlaying) return;
    if (progress > 0) writeResume(current.id, progress);
  }, [current, isPlaying, progress]);

  return (
    <>
      <audio
        ref={audioRef}
        crossOrigin="use-credentials"  // sends the auth cookie to the gated file route
        onTimeUpdate={(e) => dispatch(setProgress(Math.floor(e.target.currentTime)))}
        onLoadedMetadata={(e) => dispatch(setDuration(Math.floor(e.target.duration || 0)))}
        onEnded={() => dispatch(ended())}
        style={{ display: 'none' }}
      />
      {children}
    </>
  );
}