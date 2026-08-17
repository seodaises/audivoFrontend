import { useEffect, useRef, useState } from 'react';
import { fetchPublicLyrics } from '../../api/lyrics';

// A listener might open the Lyrics view while an artist's transcription
// job is still running. Rather than poll forever, retry a handful of
// times with a fixed gap, then settle on "not available" — matches the
// app's existing pull-based-polling convention (no websockets), scaled
// down since this is a nice-to-have display, not a status an artist is
// actively waiting on.
const MAX_ATTEMPTS = 5;
const RETRY_MS = 10_000;

const IDLE = { loading: true, available: false, lines: null, source: null, error: null };

export default function useSongLyrics(songId) {
  const [state, setState] = useState(IDLE);

  useEffect(() => {
    if (!songId) {
      setState(IDLE);
      return;
    }

    let cancelled = false;
    let timeoutId;
    let attempts = 0;
    setState(IDLE);

    const load = async () => {
      try {
        const res = await fetchPublicLyrics(songId);
        if (cancelled) return;

        if (res.available) {
          setState({ loading: false, available: true, lines: res.syncedLyrics, source: res.source, error: null });
          return;
        }

        setState({ loading: false, available: false, lines: null, source: null, error: null });
        attempts += 1;
        if (attempts < MAX_ATTEMPTS) {
          timeoutId = setTimeout(load, RETRY_MS);
        }
      } catch (e) {
        if (cancelled) return;
        // A 404 here just means the song isn't published or doesn't exist
        // from this viewer's perspective — treat it the same as "no
        // lyrics", not as a scary error banner.
        setState({ loading: false, available: false, lines: null, source: null, error: null });
      }
    };

    load();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [songId]);

  return state;
}