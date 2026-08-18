import { Stack, IconButton, Tooltip } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import MediaCardShell from './MediaCardShell';
import useSocialAlbum from '../store/hooks/useSocialAlbum';
import ShareButton from './ShareButton';

const overlayBtnSx = (activeColor) => ({
  bgcolor: 'rgba(0,0,0,0.45)',
  color: activeColor || 'common.white',
  backdropFilter: 'blur(4px)',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.65)', transform: 'scale(1.08)' },
  transition: 'transform 0.15s ease, background-color 0.15s ease',
});
export default function AlbumCard({
  albumId,
  albumPublicId = null,  // opaque handle for the share link (URL never uses the PK)
  title,
  subtitle,
  imageUrl,
  seed,
  onClick,
  onPlayAlbum = null,
  isPlaying = false,
  showShare = false,   // opt-in, same reasoning as SongCard: this overlay is
                       // shared by Browse, Library, MyCatalog and Playlists.
}) {
  const { saved, busy, toggleSave } = useSocialAlbum(albumId);

  const swallow = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  const actions = albumId ? (
    <Stack
      className="social-actions"
      direction="row"
      spacing={0.5}
      sx={{
        position: 'absolute',
        left: 6,
        top: 6,
        opacity: saved ? 1 : 0, // saved is state → stays visible off-hover
        transition: 'opacity 0.2s ease',
      }}
    >
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

      {showShare && (
        <ShareButton
          kind="album"
          albumPublicId={albumPublicId}
          albumId={albumId}
          title={title}
          sx={overlayBtnSx()}
        />
      )}
    </Stack>
  ) : null;

  const playButton = onPlayAlbum ? (
    <IconButton
      className="play-fab"
      onClick={swallow(onPlayAlbum)}
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
  ) : null;

  return (
    <MediaCardShell
      variant="album"
      title={title}
      subtitle={subtitle}
      imageUrl={imageUrl}
      seed={seed}
      onClick={onClick}
      actions={actions}
      playButton={playButton}
    />
  );
}