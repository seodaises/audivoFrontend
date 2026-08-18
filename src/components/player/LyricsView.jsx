import { Box, Typography, CircularProgress } from '@mui/material';

// progress and each line's `time` are both in seconds (see playerSlice's
// `progress` and the backend's synced_lyrics — no unit conversion needed).
// Active line = the last line whose timestamp has already passed.
const activeLineIndex = (lines, progress) => {
  let idx = 0;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].time <= progress) idx = i;
    else break;
  }
  return idx;
};

export default function LyricsView({ loading, available, lines, error, progress }) {
  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error || !available || !lines || lines.length === 0) {
    return (
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 3 }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Lyrics aren't available for this track yet.
        </Typography>
      </Box>
    );
  }

  const activeIdx = activeLineIndex(lines, progress);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', px: { xs: 1, md: 2 }, py: 2 }}>
      {lines.map((line, i) => {
        const isActive = i === activeIdx;
        const isPast = i < activeIdx;
        return (
          <Typography
            key={i}
            variant={isActive ? 'h5' : 'h6'}
            sx={{
              fontWeight: isActive ? 800 : 500,
              color: isActive ? 'primary.main' : isPast ? 'text.disabled' : 'text.secondary',
              mb: 1.5,
              lineHeight: 1.3,
              transition: 'color .25s ease',
            }}
          >
            {line.text}
          </Typography>
        );
      })}
    </Box>
  );
}