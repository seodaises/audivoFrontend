import { Box, Card, CardContent, Typography } from '@mui/material';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import SongCard from './SongCard';
import AlbumCard from './AlbumCard';
import { gradientFor } from './MediaCardShell';

export default function MediaCard({
  title,
  subtitle,
  imageUrl,
  seed = 0,
  playable = false,
  isPlaying = false,
  onTogglePlay,
  onClick,
  hideText = false,
  disableHoverLift = false,
  flushBottom = false,
  bare = false,
  songId,
}) {
  // Special-chrome fallback: bare / hideText / flushBottom / disableHoverLift.
  // Preserves the exact behaviour MyCatalogPage relies on today.
  const specialChrome = bare || hideText || flushBottom || disableHoverLift;
  if (specialChrome) {
    const hasImage = Boolean(imageUrl);
    return (
      <Card
        elevation={bare ? 0 : 1}
        square={bare}
        sx={{
          width: 180,
          flexShrink: 0,
          ...(bare
            ? { borderRadius: 0, boxShadow: 'none', bgcolor: 'transparent', backgroundImage: 'none' }
            : {
                borderRadius: 3,
                ...(flushBottom && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }),
              }),
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': disableHoverLift
            ? (bare ? {} : { boxShadow: 6 })
            : { transform: 'translateY(-4px)', boxShadow: 6 },
        }}
      >
        <Box
          onClick={onClick}
          sx={{
            position: 'relative', height: 180,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            ...(hasImage ? {} : { background: gradientFor(seed) }),
          }}
        >
          {hasImage ? (
            <Box component="img" src={imageUrl} alt={title}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <MusicNoteRoundedIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.85)' }} />
          )}
        </Box>
        {!hideText && (
          <CardContent sx={{ p: 1.5 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{title}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>
          </CardContent>
        )}
      </Card>
    );
  }

  // Normal path: delegate to the typed card.
  if (songId) {
    return (
      <SongCard
        songId={songId}
        title={title}
        subtitle={subtitle}
        imageUrl={imageUrl}
        seed={seed}
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay}
        onClick={onClick}
      />
    );
  }

  // No songId -> an album (or plain) card. The old MediaCard had NO album social
  // or album play button, so the adapter stays behaviour-identical: it passes no
  // albumId (save button stays absent) and only wires play if the caller asked
  // for `playable`. Album SAVE and the album PLAY button are new capabilities a
  // call site opts into by migrating to <AlbumCard albumId={...} onPlayAlbum={...} />
  // directly — not through this adapter.
  return (
    <AlbumCard
      title={title}
      subtitle={subtitle}
      imageUrl={imageUrl}
      seed={seed}
      onClick={onClick}
      onPlayAlbum={playable ? onTogglePlay : null}
      isPlaying={isPlaying}
    />
  );
}