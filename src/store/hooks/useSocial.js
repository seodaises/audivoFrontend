import { useCallback, useEffect, useState } from 'react';
import {
  fetchSongStatus,
  likeSong,
  unlikeSong,
  saveSong,
  unsaveSong,
} from '../../api/social';

export default function useSocialSong(songId, { enabled = true } = {}) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  // Guards against a double-click firing two requests while the first is still
  // in flight. Not the same as `loading` — that's the initial fetch.
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !songId) return;

    // The cleanup flag. If the card unmounts (user scrolls, navigates) before
    // the fetch lands, setState on an unmounted component is a warning at best
    // and a leak at worst. `alive` makes the late response a no-op.
    let alive = true;
    setLoading(true);

    fetchSongStatus(songId)
      .then((s) => {
        if (!alive) return;
        setLiked(Boolean(s.liked));
        setSaved(Boolean(s.saved));
        setLikeCount(s.likeCount ?? 0);
      })
      // A failed status read is not worth a red alert on a grid of 40 cards.
      // The button simply paints as "not liked" — which is also the correct
      // default for the overwhelmingly common case.
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [songId, enabled]);

  const toggleLike = useCallback(async () => {
    if (!songId || busy) return;
    const wasLiked = liked;
    const wasCount = likeCount;

    // Paint first.
    setLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, wasCount - 1) : wasCount + 1);
    setBusy(true);

    try {
      if (wasLiked) await unlikeSong(songId);
      else await likeSong(songId);
    } catch {
      // Ask forgiveness: put it back exactly as it was. We restore from the
      // captured `wasLiked`/`wasCount` rather than flipping again, because a
      // blind flip would be wrong if two toggles interleaved.
      setLiked(wasLiked);
      setLikeCount(wasCount);
    } finally {
      setBusy(false);
    }
  }, [songId, liked, likeCount, busy]);

  const toggleSave = useCallback(async () => {
    if (!songId || busy) return;
    const wasSaved = saved;

    setSaved(!wasSaved);
    setBusy(true);

    try {
      if (wasSaved) await unsaveSong(songId);
      else await saveSong(songId);
    } catch {
      setSaved(wasSaved);
    } finally {
      setBusy(false);
    }
  }, [songId, saved, busy]);

  return { liked, saved, likeCount, loading, busy, toggleLike, toggleSave };
}