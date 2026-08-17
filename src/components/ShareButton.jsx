import { useState } from 'react';
import { IconButton, Tooltip, Snackbar, Button } from '@mui/material';
import IosShareRoundedIcon from '@mui/icons-material/IosShareRounded';

function buildShareUrl({ kind, albumPublicId, songPublicId, albumId }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // A song points at its own player page — but only if we have its public id.
  if (kind === 'song' && songPublicId) {
    return `${origin}/play/${songPublicId}`;
  }

  // Album (or a song with no song public id yet): the album address.
  const albumRef = albumPublicId || albumId;
  if (albumRef) return `${origin}/album/${albumRef}`;

  return null;
}

export default function ShareButton({
  kind = 'album',        // 'album' | 'song'
  albumPublicId,         // preferred album handle (opaque)
  songPublicId,          // preferred song handle (opaque) — enables /play/:id
  albumId,               // legacy numeric fallback, migration only
  title,
  artistName,
  size = 'small',
  sx,
}) {
  const [toast, setToast] = useState(null); // string | null

  const url = buildShareUrl({ kind, albumPublicId, songPublicId, albumId });

  // Nothing to link to (e.g. a song with no album and no public id). Render
  // nothing rather than a button that can only fail.
  if (!url) return null;

  const shareTitle = title
    ? `${title}${artistName ? ` by ${artistName}` : ''}`
    : 'Audivo';
  const shareText =
    kind === 'song'
      ? `Listen to ${shareTitle} on Audivo`
      : `Listen to the album ${shareTitle} on Audivo`;

  const handleShare = async (e) => {

    e.stopPropagation();
    e.preventDefault();

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied');
    } catch {
      setToast(`Copy this link: ${url}`);
    }
  };

  return (
    <>
      <Tooltip title={kind === 'song' ? 'Share song' : 'Share album'}>
        <IconButton
          size={size}
          onClick={handleShare}
          aria-label={kind === 'song' ? 'Share song' : 'Share album'}
          sx={sx}
        >
          <IosShareRoundedIcon fontSize={size === 'small' ? 'small' : 'medium'} />
        </IconButton>
      </Tooltip>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        // Stops a click on the snackbar from bubbling into the card underneath.
        onClick={(e) => e.stopPropagation()}
        action={
          <Button color="inherit" size="small" onClick={() => setToast(null)}>
            Dismiss
          </Button>
        }
      />
    </>
  );
}