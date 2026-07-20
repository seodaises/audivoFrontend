import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setProgress, setDuration, ended, clearSeek, restorePlayback, reset as resetPlayer } from '../store/slices/playerSlice';
import { setPlaybarHidden } from '../store/slices/sidebarSlice';
import { songFileUrl } from '../api/catalog';
import { recordPlay } from '../api/comments';

const PLAY_THRESHOLD_SECS = 30;

const RESUME_KEY = 'audivo.player.resume';

const readResume = () => {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const trackId = parsed?.track?.id ?? null;
    const songId = parsed?.songId ?? null;

    if (!trackId) return null;
    if (songId != null && String(songId) !== String(trackId)) return null;
    if (typeof parsed.seconds !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeResume = (track, seconds, isPlaying) => {
  try {
    const payload = {
      songId: track?.id ?? null,
      seconds: Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0,
      isPlaying: Boolean(isPlaying),
      track: track
        ? {
            id: track.id,
            title: track.title,
            artist: track.artist ?? null,
            coverUrl: track.coverUrl ?? null,
            source: track.source ?? null,
          }
        : null,
    };
    localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
  } catch {
  }
};

export default function PlayerProvider({ children }) {
  const dispatch = useDispatch();
  const { current, isPlaying, seekTo, progress, repeat } = useSelector((s) => s.player);
  const user = useSelector((s) => s.auth.user);

  const checkingSession = useSelector((s) => s.auth.checkingSession);
  const audioRef = useRef(null);

  const restoredRef = useRef(false);
  const reportedIdRef = useRef(null);
  const resumeAppliedRef = useRef(false);
  
  const pendingResumeRef = useRef(null);
  const pendingResumeIdRef = useRef(null);

  const repeatRef = useRef(repeat);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);

  const loadedIdRef = useRef(null);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!current) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      loadedIdRef.current = null;
      reportedIdRef.current = null;
      resumeAppliedRef.current = false;
      restoredRef.current = false;
      return;
    }
    if (loadedIdRef.current !== current.id) {
      audio.src = songFileUrl(current.id);
      loadedIdRef.current = current.id;
      // A fresh track: neither counted nor resumed yet.
      reportedIdRef.current = null;
      resumeAppliedRef.current = false;
      if (pendingResumeIdRef.current !== null &&
          pendingResumeIdRef.current !== String(current.id)) {
        pendingResumeRef.current = null;
        pendingResumeIdRef.current = null;
      }
    }
  }, [current]);

  useEffect(() => {
    if (checkingSession) return;

    if (!user) {
     
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }
      loadedIdRef.current = null;
      reportedIdRef.current = null;
      resumeAppliedRef.current = false;
      restoredRef.current = false;
      localStorage.removeItem(RESUME_KEY);
      dispatch(setProgress(0));
      dispatch(setDuration(0));
      dispatch(resetPlayer());
      dispatch(setPlaybarHidden(true));
      return;
    }

    if (restoredRef.current || current) return;
    const saved = readResume();
    if (!saved?.track?.id) {
      restoredRef.current = true;
      return;
    }
    restoredRef.current = true;
    pendingResumeRef.current = saved.seconds || 0;
    pendingResumeIdRef.current = String(saved.track.id);
    dispatch(restorePlayback({
      track: saved.track,
      progress: saved.seconds || 0,
      isPlaying: false,
    }));
  }, [current, dispatch, user, checkingSession]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (resumeAppliedRef.current) return;

    // Nothing pending for this track — mark applied and move on.
    if (pendingResumeRef.current == null) {
      resumeAppliedRef.current = true;
      return;
    }

    const apply = () => {
      const secs = pendingResumeRef.current;
      if (secs != null) {
        // Guard against seeking past the end (e.g. saved near the finish).
        const target = Math.min(secs, Math.max((audio.duration || 0) - 1, 0));
        if (target > 0) audio.currentTime = target;
      }
      resumeAppliedRef.current = true;
      pendingResumeRef.current = null; // seek landed — onTimeUpdate may write freely now
      pendingResumeIdRef.current = null;
    };

    if (audio.readyState >= 1 /* HAVE_METADATA */) apply();
    else audio.addEventListener('loadedmetadata', apply, { once: true });

    return () => audio.removeEventListener('loadedmetadata', apply);
  }, [current]);

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      if (pendingResumeRef.current != null) {
        const secs = pendingResumeRef.current;
        const doSeekAndPlay = () => {
          const target = Math.min(secs, Math.max((audio.duration || 0) - 1, 0));
          if (target > 0) audio.currentTime = target;
          resumeAppliedRef.current = true;
          pendingResumeRef.current = null;
          pendingResumeIdRef.current = null;
          audio.play().catch(() => {});
        };
        if (audio.readyState >= 1 /* HAVE_METADATA */) {
          doSeekAndPlay();
        } else {
          // Metadata not loaded yet — wait for it, seek, THEN play, so we never
          // start audio at 0 and jump.
          audio.addEventListener('loadedmetadata', doSeekAndPlay, { once: true });
        }
        return; // play is handled inside doSeekAndPlay
      }
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

  useEffect(() => {

    if (checkingSession) return;
    if (!current || !user) {
      localStorage.removeItem(RESUME_KEY);
      return;
    }
    if (pendingResumeRef.current != null) return;
    writeResume(current, progress, isPlaying);
  }, [current, isPlaying, progress, user, checkingSession]);

  return (
    <>
      <audio
        ref={audioRef}
        crossOrigin="use-credentials"  // sends the auth cookie to the gated file route
        onTimeUpdate={(e) => {
          if (pendingResumeRef.current != null) return;
          dispatch(setProgress(Math.floor(e.target.currentTime)));
        }}
        onLoadedMetadata={(e) => dispatch(setDuration(Math.floor(e.target.duration || 0)))}
        onEnded={() => {
          const audio = audioRef.current;
          if (repeatRef.current === 'one' && audio) {
            // Allow this cycle to be counted as a fresh play.
            reportedIdRef.current = null;
            // Any stale resume intent must not hijack the replay seek.
            pendingResumeRef.current = null;
            pendingResumeIdRef.current = null;
            resumeAppliedRef.current = true;

            dispatch(setProgress(0));
            audio.currentTime = 0;
            const p = audio.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
            return;
          }

          dispatch(ended());
        }}
        style={{ display: 'none' }}
      />
      {children}
    </>
  );
}