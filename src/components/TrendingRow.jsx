import { Box, Stack, Typography, IconButton, Avatar, Tooltip } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';

export default function TrendingRow({
  rank,
  title,
  subtitle,
  imageUrl,
  variant = 'song',
  breakdown = null,   // e.g. "24 plays · 4 likes · 2 saves"
  isPlaying = false,
  onTogglePlay = null,
  onClick,
}) {
  const isAlbum = variant === 'album';

  // The top three get the accent colour — a leaderboard where every rank looks
  // identical doesn't communicate that the top is the point.
  const isPodium = rank <= 3;

  return (
    <Stack
      direction="row"
      onClick={onClick}
      sx={{
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.5,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .18s ease, background-color .18s ease',
        '&:hover': {
          borderColor: (t) => t.palette.primary.main,
          bgcolor: 'action.hover',
        },
        '&:hover .trending-play': { opacity: 1 },
      }}
    >
      <Typography
        sx={{
          width: 28,
          flexShrink: 0,
          textAlign: 'center',
          fontWeight: 800,
          fontSize: 20,
          lineHeight: 1,
          color: isPodium ? 'primary.main' : 'text.disabled',
        }}
      >
        {rank}
      </Typography>

      <Avatar
        src={imageUrl || undefined}
        variant={isAlbum ? 'rounded' : 'circular'}
        sx={{ width: 44, height: 44, flexShrink: 0, bgcolor: 'action.selected' }}
      >
        <MusicNoteRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
      </Avatar>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {subtitle}
        </Typography>
      </Box>

      {breakdown && (
        <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'right', flexShrink: 0 }}>
          <Typography variant="caption" color="text.disabled" noWrap>
            {breakdown}
          </Typography>
        </Box>
      )}

      {onTogglePlay && (
        <Tooltip title={isPlaying ? 'Pause' : 'Play'}>
          <IconButton
            className="trending-play"
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
            aria-label={isPlaying ? `Pause ${title}` : `Play ${title}`}
            sx={{
              flexShrink: 0,
              bgcolor: isPlaying ? 'primary.main' : 'action.selected',
              color: isPlaying ? 'primary.contrastText' : 'text.primary',
              // Visible when playing, otherwise revealed on row hover — keeps a
              // long list calm instead of studded with buttons.
              opacity: isPlaying ? 1 : 0,
              transition: 'opacity .18s ease, background-color .18s ease',
              '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' },
            }}
          >
            {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
          </IconButton>
        </Tooltip>
      )}
    </Stack>
  );
}