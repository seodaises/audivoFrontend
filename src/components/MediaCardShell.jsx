import { Box, Card, CardContent, Typography } from '@mui/material';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { useCoverAccentColor } from '../store/hooks/useCoverAccentColor';

export const gradientFor = (seed = 0) => {
  const h1 = Math.round(seed * 137.508) % 360;
  const h2 = (h1 + 50) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 45%), hsl(${h2} 60% 35%))`;
};
const CARD_W = 180;
const COVER_H = 180;
const CIRCLE_INSET = 12;
const PEEK = 10; // px the stack layer escapes up and to the right

export default function MediaCardShell({
  title,
  subtitle,
  imageUrl,
  seed = 0,
  onClick,
  variant = 'song',   // 'song' | 'album'
  bare = false,
  actions = null,
  playButton = null,
  footer = null,
}) {
  const hasImage = Boolean(imageUrl);
  const isAlbum = variant === 'album';
  const gradient = gradientFor(seed);
  const circleSize = COVER_H - CIRCLE_INSET * 2;
  // Best-effort — null until (and unless) extraction succeeds; every use
  // below falls back to the existing neutral/seed-based look when it's null.
  const accentColor = useCoverAccentColor(hasImage ? imageUrl : null);

  const cover = (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        // In bare mode the CALLER owns the frame and its clip, so the cover
        // must not round its own corners — two clips on the same box show a
        // hairline seam where the radii disagree.
        borderRadius: bare ? 0 : (isAlbum ? 2.5 : '50%'),
        // A circle must be square, so the song cover is an explicitly sized box
        // centred in the card; the album cover fills the full width. In bare
        // mode neither applies — the cover just fills the caller's frame.
        ...(bare
          ? { width: '100%', height: COVER_H }
          : isAlbum
            ? { width: CARD_W, height: COVER_H }
            : {
                width: circleSize,
                height: circleSize,
                mx: 'auto',
                mt: `${CIRCLE_INSET}px`,
              }),
        ...(hasImage ? {} : { background: gradient }),
      }}
    >
      {hasImage ? (
        <Box
          component="img"
          src={imageUrl}
          alt={title}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
        />
      ) : (
        <MusicNoteRoundedIcon sx={{ fontSize: 44, color: 'rgba(255,255,255,0.85)' }} />
      )}

      {actions}
      {playButton}
    </Box>
  );

  const text = (
    <>
      <Typography
        variant="subtitle2"
        noWrap
        sx={{ fontWeight: 700, textAlign: isAlbum ? 'left' : 'center' }}
      >
        {title}
      </Typography>
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        sx={{ display: 'block', textAlign: isAlbum ? 'left' : 'center' }}
      >
        {subtitle}
      </Typography>
    </>
  );

  // ── BARE: cover only. Caller owns the frame and the text. ────────────────
  if (bare) {
    return cover;
  }

  // ── ALBUM: no Card wrapper. Cover + text sit on the page. ────────────────
  if (isAlbum) {
    return (
      <Box
        sx={{
          position: 'relative',
          width: CARD_W + PEEK,
          // Top padding is what the peek layer occupies — without it the layer
          // would be clipped by whatever sits above in the shelf, which is the
          // bug that made it show as a thin sliver on the right edge only.
          pt: `${PEEK}px`,
          flexShrink: 0,
          cursor: onClick ? 'pointer' : 'default',
          '&:hover .stack-layer': { transform: `translate(${PEEK + 3}px, -3px)` },
          '&:hover .album-cover': { transform: 'translateY(-3px)' },
        }}
      >
        {/* The record behind. Colored from the cover's own extracted accent
            when we have one (see useCoverAccentColor) — falls back to the
            original neutral tone when extraction wasn't possible. */}
        <Box
          aria-hidden
          className="stack-layer"
          sx={{
            position: 'absolute',
            top: 0,
            left: `${PEEK}px`,
            width: CARD_W,
            height: COVER_H,
            borderRadius: 2.5,
            bgcolor: accentColor || 'text.disabled',
            opacity: accentColor ? 0.7 : 0.55,
            transition: 'transform 0.2s ease, background-color 0.3s ease',
          }}
        />

        <Box
          className="album-cover"
          sx={{
            position: 'relative',
            transition: 'transform 0.2s ease',
            '&:hover .play-fab': { opacity: 1 },
            '&:hover .social-actions': { opacity: 1 },
          }}
        >
          {cover}
        </Box>

        <Box sx={{ width: CARD_W, mt: 1.25 }}>
          {text}
          {footer}
        </Box>
      </Box>
    );
  }

  // ── SONG: raised card with a circular cover. ─────────────────────────────
  return (
    <Card
      elevation={1}
      sx={{
        position: 'relative',
        width: CARD_W,
        flexShrink: 0,
        borderRadius: 3,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
        '&:hover .play-fab': { opacity: 1 },
        '&:hover .social-actions': { opacity: 1 },
      }}
    >
      {cover}
      <CardContent sx={{ p: 1.5, pt: 1, '&:last-child': { pb: 1.5 } }}>
        {text}
        {footer}
      </CardContent>
    </Card>
  );
}