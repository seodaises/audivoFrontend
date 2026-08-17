import { useState } from 'react';
import { Stack, IconButton, Tooltip, Typography, Box, Link } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import MediaCardShell from './MediaCardShell';
import AddToPlaylistDialog from './AddToPlaylistDialog';
import ShareButton from './ShareButton';
import useSocialSong from '../store/hooks/useSocial';
import { useDispatch } from 'react-redux';
import { enqueueTrack } from '../store/slices/playerSlice';

const footerBtnSx = (activeColor) => ({
  p: 0.5,
  color: activeColor || 'text.secondary',
  '&:hover': { color: activeColor || 'text.primary', bgcolor: 'action.hover' },
  transition: 'color 0.15s ease, background-color 0.15s ease',
});

export default function SongCard({
  songId,
  songPublicId = null,   // opaque song handle — enables sharing to /play/:publicId
  title,
  subtitle,
  imageUrl,
  seed,
  artist,
  album = null,          // { id, publicId, title } — renders a link row under the controls
  showShare = false,     // opt-in: adds a share action to the footer row.
                         // Default off so existing callers are unaffected —
                         // this footer is a shared contract across four pages.
  isPlaying = false,
  onTogglePlay,
  onClick,
  onAlbumClick,          // (albumRef) => void — receives the album's public id
  onArtistClick,         // (artist)  => void
}) {
  const dispatch = useDispatch();
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const { liked, saved, likeCount, busy, toggleLike, toggleSave } = useSocialSong(songId);

  // Stop the card's onClick (navigate/play) firing when a control is hit.
  const swallow = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  const playButton = (
    <IconButton
      className="play-fab"
      onClick={swallow(onTogglePlay)}
      aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        bgcolor: 'primary.main',
        color: 'primary.contrastText',
        opacity: isPlaying ? 1 : 0,
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        '&:hover': {
          bgcolor: 'primary.dark',
          transform: 'translate(-50%, -50%) scale(1.08)',
        },
      }}
    >
      {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
    </IconButton>
  );

  const footer = (
    <Box sx={{ mt: 1 }}>
      <Stack
        direction="row"
        spacing={0}
        sx={{ justifyContent: 'center', alignItems: 'center' }}
      >
        <Tooltip title={liked ? 'Unlike' : 'Like'}>
          <span>
            <IconButton
              size="small"
              disabled={busy}
              onClick={swallow(toggleLike)}
              aria-label={liked ? `Unlike ${title}` : `Like ${title}`}
              sx={footerBtnSx(liked ? 'error.main' : undefined)}
            >
              {liked
                ? <FavoriteRoundedIcon fontSize="small" />
                : <FavoriteBorderRoundedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        {/* Public like total. Hidden at zero — a "0" on every card is noise. */}
        {likeCount > 0 && (
          <Typography
            variant="caption"
            aria-label={`${likeCount} ${likeCount === 1 ? 'like' : 'likes'}`}
            sx={{ color: 'text.secondary', fontWeight: 700, mr: 0.25 }}
          >
            {likeCount}
          </Typography>
        )}

        <Tooltip title={saved ? 'Remove from library' : 'Save to library'}>
          <span>
            <IconButton
              size="small"
              disabled={busy}
              onClick={swallow(toggleSave)}
              aria-label={saved ? `Remove ${title} from library` : `Save ${title} to library`}
              sx={footerBtnSx(saved ? 'primary.main' : undefined)}
            >
              {saved
                ? <BookmarkRoundedIcon fontSize="small" />
                : <BookmarkBorderRoundedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Add to playlist">
          <span>
            <IconButton
              size="small"
              onClick={swallow(() => setPlaylistOpen(true))}
              aria-label={`Add ${title} to a playlist`}
              sx={footerBtnSx()}
            >
              <PlaylistAddRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title="Add to queue">
          <span>
            <IconButton
              size="small"
              onClick={swallow(() => dispatch(enqueueTrack({
                id: songId,
                title,
                artist: artist ?? null,
                coverUrl: imageUrl || null,
              })))}
              aria-label={`Add ${title} to queue`}
              sx={footerBtnSx()}
            >
              <QueueMusicRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        {showShare && (
          <ShareButton
            kind="song"
            songPublicId={songPublicId}
            albumPublicId={album?.publicId}
            albumId={album?.id}
            title={title}
            artistName={artist?.stageName}
            sx={footerBtnSx()}
          />
        )}
      </Stack>
      {(album || artist?.username) && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ justifyContent: 'center', alignItems: 'center', mt: 0.25 }}
        >
          {album && onAlbumClick && (
            <Link
              component="button"
              variant="caption"
              underline="hover"
              onClick={swallow(() => onAlbumClick(album.publicId ?? album.id))}
              sx={{
                color: 'text.secondary',
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {album.title}
            </Link>
          )}
          {album && onAlbumClick && artist?.username && onArtistClick && (
            <Typography variant="caption" color="text.disabled">·</Typography>
          )}
          {artist?.username && onArtistClick && (
            <Link
              component="button"
              variant="caption"
              underline="hover"
              onClick={swallow(() => onArtistClick(artist))}
              sx={{
                color: 'text.secondary',
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {artist.stageName ?? artist.username}
            </Link>
          )}
        </Stack>
      )}
    </Box>
  );

  return (
    <>
      <MediaCardShell
        variant="song"
        title={title}
        subtitle={subtitle}
        imageUrl={imageUrl}
        seed={seed}
        onClick={onClick}
        playButton={playButton}
        footer={footer}
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