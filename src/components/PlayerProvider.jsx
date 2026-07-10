import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setProgress, setDuration, ended, clearSeek } from '../store/slices/playerSlice';
import { songFileUrl } from '../api/catalog';

// The single owner of the real <audio> element for the entire app. It renders
// no visible UI — it just mounts one hidden <audio> and keeps it in sync with
// the player slice:
//   Redux -> audio:  load a new track's src, play/pause, seek.
//   audio -> Redux:  report progress, duration, and end-of-track.
// Because it sits above the router (in App), the element and its playback
// survive route changes — that's what makes the now-playing bar persistent.
export default function PlayerProvider({ children }) {
  const dispatch = useDispatch();
  const { current, isPlaying, seekTo } = useSelector((s) => s.player);
  const audioRef = useRef(null);

  // Load a new source ONLY when the track id changes. Watching `current.id`
  // (not the whole object) avoids reloading the file on every play/pause.
  // This one effect now also covers next/prev/auto-advance, since each of
  // those changes current.id — the new track's file loads here, and the
  // play/pause effect below starts it because isPlaying is true.
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
      return;
    }
    if (loadedIdRef.current !== current.id) {
      audio.src = songFileUrl(current.id);
      loadedIdRef.current = current.id;
    }
  }, [current]);

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

  // Consume a seek request from the bar, then clear it.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTo == null) return;
    audio.currentTime = seekTo;
    dispatch(clearSeek());
  }, [seekTo, dispatch]);

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