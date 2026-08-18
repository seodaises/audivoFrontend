import { useState } from 'react';
import {
  Box, Paper, Typography, IconButton, Stack, Avatar, Tooltip, Fab,
  Popover, Button, LinearProgress,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import PictureInPictureAltRoundedIcon from '@mui/icons-material/PictureInPictureAltRounded';
import { useSelector, useDispatch } from 'react-redux';
import { togglePlay, openFocused, togglePip } from '../store/slices/playerSlice';
import { useSidebar } from '../store/hooks/useSidebar';
import useSocialSong from '../store/hooks/useSocial';
import {
  SIDEBAR_RAIL_WIDTH,
  SIDEBAR_FULL_WIDTH,
  PLAYBAR_HEIGHT,
} from '../constants/layout';
import {
  TransportControls, SeekRow, QueueList, usePlayerQueueControls,
} from './player/playerControls';
import FocusedPlayer from './player/FocusedPlayer';
import PipPlayer from './player/PipPlayer';

function MiniPlayerBar({ current, isPlaying, progress, duration, onTogglePlay, onExpand }) {
  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <LinearProgress
        variant="determinate"
        value={duration ? Math.min(100, (progress / duration) * 100) : 0}
        sx={{ position: 'absolute', top: -8, left: 0, right: 0, height: 3 }}
      />
      <Stack
        direction="row"
        spacing={1.5}
        onClick={onExpand}
        sx={{ alignItems: 'center', width: '100%', cursor: 'pointer' }}
      >
        <Avatar
          variant="rounded"
          src={current.coverUrl || undefined}
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 40, height: 40, flexShrink: 0 }}
        >
          <MusicNoteRoundedIcon fontSize="small" />
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
            {current.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {current.artist?.stageName ?? 'Unknown artist'}
          </Typography>
        </Box>
        <IconButton
          onClick={(e) => { e.stopPropagation(); onTogglePlay(); }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          sx={{
            flexShrink: 0,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            '&:hover': { bgcolor: 'primary.dark' },
          }}
        >
          {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </IconButton>
      </Stack>
    </Box>
  );
}

export default function NowPlayingBar() {
  const dispatch = useDispatch();
  const { current, isPlaying, progress, duration, repeat, shuffle } =
    useSelector((s) => s.player);
  const { sidebarHidden, playbarHidden, togglePlaybar } = useSidebar();
  const [queueAnchorEl, setQueueAnchorEl] = useState(null);

  // Queue wiring (sensors, drag-end, play/remove/clear, hasNext) — shared with
  // the focused overlay so the queue behaves identically in both.
  const { queue, index, sensors, hasNext, onDragEnd, playItem, removeItem, clear } =
    usePlayerQueueControls();
  const { liked, busy: likeBusy, toggleLike } = useSocialSong(current?.id);

  const drawerWidth = sidebarHidden ? SIDEBAR_RAIL_WIDTH : SIDEBAR_FULL_WIDTH;

  const playQueueItem = (itemIndex) => { playItem(itemIndex); setQueueAnchorEl(null); };
  const clearQueueList = () => { clear(); setQueueAnchorEl(null); };
  const queueOpen = Boolean(queueAnchorEl);

  if (!current) return null;

  const overlays = (
    <>
      <FocusedPlayer />
      <PipPlayer />
    </>
  );

  if (playbarHidden) {
    return (
      <>
        {overlays}
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
      </>
    );
  }

  return (
    <>
      {overlays}
      <Paper
        elevation={8}
        square
        sx={{
          position: 'fixed',
          left: { xs: 0, md: `${drawerWidth}px` },
          right: 0, bottom: 0,
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
          overflow: 'hidden',
        }}
      >
        {/* Below sm: compact bar, taps open the focused player. */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, width: '100%' }}>
          <MiniPlayerBar
            current={current}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            onTogglePlay={() => dispatch(togglePlay())}
            onExpand={() => dispatch(openFocused())}
          />
        </Box>

        {/* sm and up: the full control bar. */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', width: '100%', display: { xs: 'none', sm: 'flex' } }}>
          <Avatar
            variant="rounded"
            src={current.coverUrl || undefined}
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', width: 44, height: 44 }}
          >
            <MusicNoteRoundedIcon fontSize="small" />
          </Avatar>
          <Box sx={{ minWidth: 0, width: 200 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
              {current.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {current.artist?.stageName ?? 'Unknown artist'}
            </Typography>
          </Box>
          <Tooltip title={liked ? 'Unlike' : 'Like'}>
            <IconButton
              onClick={() => toggleLike()}
              disabled={likeBusy}
              aria-label={liked ? 'Unlike current track' : 'Like current track'}
              aria-pressed={liked}
              size="small"
              sx={{ color: liked ? 'error.main' : 'text.secondary' }}
            >
              {liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          <TransportControls
            dispatch={dispatch} isPlaying={isPlaying} shuffle={shuffle} repeat={repeat} hasNext={hasNext}
          />

          <Tooltip title="Up next">
            <IconButton
              onClick={(event) => setQueueAnchorEl(event.currentTarget)}
              aria-label="Queue"
              aria-pressed={queueOpen}
              size="small"
              sx={{ color: queueOpen ? 'primary.main' : 'text.secondary' }}
            >
              <QueueMusicRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Popover
            open={queueOpen}
            anchorEl={queueAnchorEl}
            onClose={() => setQueueAnchorEl(null)}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            slotProps={{ paper: { sx: { mt: 1, borderRadius: 3, boxShadow: 6, overflow: 'visible' } } }}
          >
            <Box sx={{ width: { xs: 300, sm: 360 }, p: 1.5 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Up next</Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
                  </Typography>
                  <Button size="small" onClick={clearQueueList} disabled={queue.length <= 1}>Clear</Button>
                </Stack>
              </Stack>
              <QueueList
                queue={queue} index={index} sensors={sensors}
                onDragEnd={onDragEnd} onPlayItem={playQueueItem} onRemoveItem={removeItem}
              />
            </Box>
          </Popover>

          <SeekRow dispatch={dispatch} progress={progress} duration={duration} />

          {/* The focus (expand) button — deliberately large and icon-only. Opens
              the full-viewport focused player. */}
          <Tooltip title="Focus mode">
            <IconButton
              onClick={() => dispatch(openFocused())}
              aria-label="Open focused player"
              sx={{
                flexShrink: 0,
                width: 48, height: 48,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.dark' },
              }}
            >
              <OpenInFullRoundedIcon sx={{ fontSize: 26 }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Mini player">
            <IconButton onClick={() => dispatch(togglePip())} aria-label="Toggle mini player" size="small">
              <PictureInPictureAltRoundedIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Hide player">
            <IconButton onClick={togglePlaybar} aria-label="Hide player" size="small">
              <KeyboardArrowDownRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    </>
  );
}