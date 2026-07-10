import { Box, Paper, Typography, IconButton, Slider, Stack, Avatar } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { useSelector, useDispatch } from 'react-redux';
import { togglePlay, requestSeek, next, prev } from '../store/slices/playerSlice';
import { useSidebar } from '../store/hooks/useSidebar';

const fmt = (secs) => {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

// The persistent player bar. Reads playback state from the store and issues
// intents (toggle, seek, next, prev) back to it — it never touches the audio
// element directly; PlayerProvider does. Renders null when nothing is loaded so
// it stays out of the way until the first play.
export default function NowPlayingBar() {
  const dispatch = useDispatch();
  const { current, isPlaying, progress, duration, queue, index } =
    useSelector((s) => s.player);
    const { sidebarHidden } = useSidebar();
  // Match the sidebar's two widths so the bar starts flush with the main area,
  // not under the drawer. Only applies at md+ where the permanent drawer exists;
  // on xs the drawer is display:none so the bar spans full width.
  const railWidth = 72;
  const fullWidth = 240;
  const drawerWidth = sidebarHidden ? railWidth : fullWidth;
  if (!current) return null;

  // Next is available only if there's a later track in the queue. Prev is
  // always meaningful — it either steps back or restarts the current track —
  // so it's never disabled.
  const hasNext = index >= 0 && index < queue.length - 1;

  return (
    <Paper
      elevation={8}
      square
      sx={{
        position: 'fixed',
        left: { xs: 0, md: `${drawerWidth}px` },
        right: 0, bottom: 0,
        transition: (theme) => theme.transitions.create('left', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: { xs: 2, sm: 3 },
        py: 1,
        borderTop: 1,
        borderColor: 'divider',
        backgroundImage: 'none',
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        {/* Track identity — real cover if we have one, else the note icon. */}
        <Avatar
          variant="rounded"
          src={current.coverUrl || undefined}
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 44, height: 44 }}
        >
          <MusicNoteRoundedIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0, width: { xs: 96, sm: 200 } }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
            {current.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {current.artist?.stageName ?? 'Unknown artist'}
          </Typography>
        </Box>

        {/* Transport: prev / play-pause / next */}
        <IconButton
          onClick={() => dispatch(prev())}
          aria-label="Previous track"
          size="small"
        >
          <SkipPreviousRoundedIcon />
        </IconButton>

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

        <IconButton
          onClick={() => dispatch(next())}
          aria-label="Next track"
          size="small"
          disabled={!hasNext}
        >
          <SkipNextRoundedIcon />
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