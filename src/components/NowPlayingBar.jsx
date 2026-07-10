import { Box, Paper, Typography, IconButton, Slider, Stack, Avatar } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { useSelector, useDispatch } from 'react-redux';
import { togglePlay, requestSeek } from '../store/slices/playerSlice';

const fmt = (secs) => {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

// The persistent player bar. Reads playback state from the store and issues
// intents (toggle, seek) back to it — it never touches the audio element
// directly; PlayerProvider does. Renders null when nothing is loaded so it
// stays out of the way until the first play.
export default function NowPlayingBar() {
  const dispatch = useDispatch();
  const { current, isPlaying, progress, duration } = useSelector((s) => s.player);

  if (!current) return null;

  return (
    <Paper
      elevation={8}
      square
      sx={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: { xs: 2, sm: 3 },
        py: 1,
        borderTop: 1,
        borderColor: 'divider',
        backgroundImage: 'none',
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        {/* Track identity */}
        <Avatar
          variant="rounded"
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 44, height: 44 }}
        >
          <MusicNoteRoundedIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0, width: { xs: 120, sm: 200 } }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
            {current.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {current.artist?.stageName ?? 'Unknown artist'}
          </Typography>
        </Box>

        {/* Play/pause */}
        <IconButton
          onClick={() => dispatch(togglePlay())}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </IconButton>

        {/* Seek slider with time labels */}
        <Typography variant="caption" color="text.secondary" sx={{ width: 40, textAlign: 'right' }}>
          {fmt(progress)}
        </Typography>
        <Slider
          size="small"
          value={Math.min(progress, duration || 0)}
          max={duration || 0}
          onChange={(_, val) => dispatch(requestSeek(val))}
          aria-label="Seek"
          sx={{ flexGrow: 1, mx: 1 }}
          disabled={!duration}
        />
        <Typography variant="caption" color="text.secondary" sx={{ width: 40 }}>
          {fmt(duration)}
        </Typography>
      </Stack>
    </Paper>
  );
}