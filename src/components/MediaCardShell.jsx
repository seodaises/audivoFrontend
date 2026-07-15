import { Box, Card, CardContent, Typography } from '@mui/material';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';

// Deterministic cover gradient. 137.508° is the golden angle — stepping hue by
// it spreads consecutive ids across the colour wheel instead of clustering them,
// so two cards made back-to-back don't come out nearly the same colour. Shared
// by every card surface (SongCard, AlbumCard, PlaylistsPage, DiscoverPage).
export const gradientFor = (seed = 0) => {
  const h1 = Math.round(seed * 137.508) % 360;
  const h2 = (h1 + 50) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 45%), hsl(${h2} 60% 35%))`;
};

// The visual chrome every media card shares: fixed-size card, cover image or
// gradient fallback, hover lift, the title/subtitle block, and two SLOTS the
// typed cards fill —
//   `actions`     — the top-left social cluster (like/save/playlist)
//   `playButton`  — the bottom-right play affordance
//
// This component owns NO social or playback logic. That lives in SongCard /
// AlbumCard, which is the whole point of the split: the shell is dumb and
// identical, the behaviour is typed. Splitting this way means "how does a card
// look" and "what can you do to a song vs an album" are answered in different
// files, and neither leaks into the other.
export default function MediaCardShell({
  title,
  subtitle,
  imageUrl,
  seed = 0,
  onClick,
  actions = null,     // ReactNode rendered top-left, revealed on hover (+ when active)
  playButton = null,  // ReactNode rendered bottom-right
}) {
  const hasImage = Boolean(imageUrl);

  return (
    <Card
      elevation={1}
      sx={{
        width: 180,
        flexShrink: 0,
        borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
        '&:hover .play-fab': { opacity: 1 },
        '&:hover .social-actions': { opacity: 1 },
      }}
    >
      <Box
        onClick={onClick}
        sx={{
          position: 'relative',
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          ...(hasImage ? {} : { background: gradientFor(seed) }),
        }}
      >
        {hasImage ? (
          <Box
            component="img"
            src={imageUrl}
            alt={title}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <MusicNoteRoundedIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.85)' }} />
        )}

        {actions}
        {playButton}
      </Box>

      <CardContent sx={{ p: 1.5 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>{subtitle}</Typography>
      </CardContent>
    </Card>
  );
}