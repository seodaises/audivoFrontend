import { Box, Paper, Typography, IconButton, Slider, Stack, Avatar, Tooltip, Fab } from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
import RepeatOneRoundedIcon from '@mui/icons-material/RepeatOneRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import { useSelector, useDispatch } from 'react-redux';
import { togglePlay, requestSeek, next, prev, cycleRepeat, toggleShuffle } from '../store/slices/playerSlice';
import { useSidebar } from '../store/hooks/useSidebar';
import {
  SIDEBAR_RAIL_WIDTH,
  SIDEBAR_FULL_WIDTH,
  PLAYBAR_HEIGHT,
} from '../constants/layout';

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
  const { current, isPlaying, progress, duration, repeat, shuffle, order, orderPos } =
    useSelector((s) => s.player);
  const { sidebarHidden, playbarHidden, togglePlaybar } = useSidebar();

  // Match the sidebar's two widths so the bar starts flush with the main area,
  // not under the drawer. Only applies at md+ where the permanent drawer exists;
  // on xs the drawer is display:none so the bar spans full width.
  const drawerWidth = sidebarHidden ? SIDEBAR_RAIL_WIDTH : SIDEBAR_FULL_WIDTH;

  if (!current) return null;

  // Hidden is a VIEW state, not a playback state — the audio keeps going. So we
  // must still render something, or there'd be music playing with no way to
  // reach the controls. A small floating button restores the bar.
  //
  // (Returning null here would be a trap: hide the bar, and the only way back
  // would be to clear localStorage.)
  if (playbarHidden) {
    return (
      <Tooltip title="Show player">
        <Fab
          size="small"
          color="primary"
          onClick={togglePlaybar}
          aria-label="Show player"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: (t) => t.zIndex.appBar + 1,
          }}
        >
          <MusicNoteRoundedIcon fontSize="small" />
        </Fab>
      </Tooltip>
    );
  }

  // Next is available when there's a later track IN PLAY ORDER — which under
  // shuffle is not the same as the raw queue position — or when repeat-all is on
  // (it wraps to the front, so Next is always meaningful). The old check used the
  // queue index directly, so it wrongly greyed out Next on the last queue item
  // even when shuffle put a different track next, or when repeat-all would wrap.
  // Prev is always meaningful (it steps back or restarts), so it's never disabled.
  const hasNext =
    orderPos >= 0 &&
    (repeat === 'all' || orderPos < order.length - 1);

  return (
    <Paper
      elevation={8}
      square
      sx={{
        position: 'fixed',
        left: { xs: 0, md: `${drawerWidth}px` },
        right: 0, bottom: 0,
        // Pinned so AppLayout's bottom padding can trust PLAYBAR_HEIGHT. If this
        // box could grow, the padding would be a guess again.
        height: PLAYBAR_HEIGHT,
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
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
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

        {/* Transport: shuffle / prev / play-pause / next / repeat */}
        <Tooltip title={shuffle ? 'Shuffle on' : 'Shuffle'}>
          <IconButton
            onClick={() => dispatch(toggleShuffle())}
            aria-label="Shuffle"
            aria-pressed={shuffle}
            size="small"
            sx={{ color: shuffle ? 'primary.main' : 'text.secondary' }}
          >
            <ShuffleRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

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

        {/* Repeat cycles off -> all -> one. The button is coloured for all/one
            and shows the "1" variant icon for repeat-one, so the current mode is
            readable at a glance without a label. Note next is disabled at the end
            of a queue, but repeat-all still auto-wraps on track END — the two are
            different actions. */}
        <Tooltip title={repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat'}>
          <IconButton
            onClick={() => dispatch(cycleRepeat())}
            aria-label="Repeat"
            aria-pressed={repeat !== 'off'}
            size="small"
            sx={{ color: repeat !== 'off' ? 'primary.main' : 'text.secondary' }}
          >
            {repeat === 'one'
              ? <RepeatOneRoundedIcon fontSize="small" />
              : <RepeatRoundedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

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

        {/* Dismiss. Deliberately NOT a stop button — audio keeps playing, this
            only gets the bar out of the way. The Fab above brings it back. */}
        <Tooltip title="Hide player">
          <IconButton
            onClick={togglePlaybar}
            aria-label="Hide player"
            size="small"
          >
            <KeyboardArrowDownRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    </Paper>
  );
}