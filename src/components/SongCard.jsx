import { useState } from 'react';
import { Stack, IconButton, Tooltip } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import MediaCardShell from './MediaCardShell';
import AddToPlaylistDialog from './AddToPlaylistDialog';
import useSocialSong from '../store/hooks/useSocial';

// Shared overlay-button styling for the three social actions. Extracted so the
// like / save / playlist buttons stay visually identical without repeating the
// sx block three times.
const overlayBtnSx = (activeColor) => ({
  bgcolor: 'rgba(0,0,0,0.45)',
  color: activeColor || 'common.white',
  backdropFilter: 'blur(4px)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.65)', transform: 'scale(1.08)' },
  transition: 'transform 0.15s ease, background-color 0.15s ease',
});

// A card for a SONG. Songs can be liked, saved, added to a playlist, and played.
// All of that behaviour lives here; the shell just draws the frame. Contrast
// AlbumCard, which is save + play only — the split is exactly so each card
// carries only the actions its entity actually supports.
export default function SongCard({
  songId,
  title,
  subtitle,
  imageUrl,
  seed,
  isPlaying = false,
  onTogglePlay,
  onClick,
}) {
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const { liked, saved, busy, toggleLike, toggleSave } = useSocialSong(songId);

  // Stop the card's onClick (navigate/play) firing when an overlay button is hit.
  const swallow = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  const actions = (
    <Stack
      className="social-actions"
      direction="row"
      spacing={0.5}
      sx={{
        position: 'absolute',
        left: 6,
        top: 6,
        // Like/save are STATE — they stay visible when already active even off
        // hover. The playlist button is stateless, so it only shows on hover
        // (via the shell's `:hover .social-actions` rule bringing the row to 1).
        opacity: liked || saved ? 1 : 0,
        transition: 'opacity 0.2s ease',
      }}
    >
      <Tooltip title={liked ? 'Unlike' : 'Like'}>
        <span>
          <IconButton
            size="small"
            disabled={busy}
            onClick={swallow(toggleLike)}
            aria-label={liked ? `Unlike ${title}` : `Like ${title}`}
            sx={overlayBtnSx(liked ? 'error.main' : undefined)}
          >
            {liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title={saved ? 'Remove from library' : 'Save to library'}>
        <span>
          <IconButton
            size="small"
            disabled={busy}
            onClick={swallow(toggleSave)}
            aria-label={saved ? `Remove ${title} from library` : `Save ${title} to library`}
            sx={overlayBtnSx(saved ? 'primary.main' : undefined)}
          >
            {saved ? <BookmarkRoundedIcon fontSize="small" /> : <BookmarkBorderRoundedIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>

      <Tooltip title="Add to playlist">
        <span>
          <IconButton
            size="small"
            onClick={swallow(() => setPlaylistOpen(true))}
            aria-label={`Add ${title} to a playlist`}
            sx={overlayBtnSx()}
          >
            <PlaylistAddRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );

  const playButton = (
    <IconButton
      className="play-fab"
      onClick={swallow(onTogglePlay)}
      aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
      sx={{
        position: 'absolute', right: 8, bottom: 8,
        bgcolor: 'primary.main', color: 'primary.contrastText',
        opacity: isPlaying ? 1 : 0,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        '&:hover': { bgcolor: 'primary.dark', transform: 'scale(1.06)' },
      }}
    >
      {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
    </IconButton>
  );

  return (
    <>
      <MediaCardShell
        title={title}
        subtitle={subtitle}
        imageUrl={imageUrl}
        seed={seed}
        onClick={onClick}
        actions={actions}
        playButton={playButton}
      />
      <AddToPlaylistDialog
        open={playlistOpen}
        onClose={() => setPlaylistOpen(false)}
        songId={songId}
        songTitle={title}
      />
    </>
  );
}