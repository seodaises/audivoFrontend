import { useCallback, useEffect, useState } from 'react';
import { fetchAlbumStatus, saveAlbum, unsaveAlbum } from '../../api/social';

export default function useSocialAlbum(albumId, { enabled = true } = {}) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled || !albumId) return;

    // Same unmount guard as useSocialSong — a late status response on an
    // unmounted card must be a no-op, not a setState warning.
    let alive = true;
    setLoading(true);

    fetchAlbumStatus(albumId)
      .then((s) => {
        if (!alive) return;
        setSaved(Boolean(s.saved));
      })
      .catch(() => {}) // a failed status read just paints "not saved", the right default
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [albumId, enabled]);

  const toggleSave = useCallback(async () => {
    if (!albumId || busy) return;
    const wasSaved = saved;

    setSaved(!wasSaved); // optimistic paint
    setBusy(true);

    try {
      if (wasSaved) await unsaveAlbum(albumId);
      else await saveAlbum(albumId);
    } catch {
      setSaved(wasSaved); // roll back to captured value
    } finally {
      setBusy(false);
    }
  }, [albumId, saved, busy]);

  return { saved, loading, busy, toggleSave };
}