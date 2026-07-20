import { useState } from 'react';
import {
  Box, Paper, Typography, IconButton, Slider, Stack, Avatar, Tooltip, Fab,
  Popover, Chip, Button, Dialog, LinearProgress,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
import RepeatOneRoundedIcon from '@mui/icons-material/RepeatOneRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useSelector, useDispatch } from 'react-redux';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { togglePlay, requestSeek, next, prev, cycleRepeat, toggleShuffle, reorderQueue, removeFromQueue, clearQueue, playFromQueue } from '../store/slices/playerSlice';
import { useSidebar } from '../store/hooks/useSidebar';
import useSocialSong from '../store/hooks/useSocial';
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

function SortableQueueTrack({ track, index, isCurrent, onClick, onRemove }) {
  const id = String(track.id ?? `${track.title ?? 'track'}-${index}`);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const artistLabel = typeof track.artist === 'string'
    ? track.artist
    : track.artist?.stageName || track.artist?.name || 'Unknown artist';

  return (
    <Box
      ref={setNodeRef}
      style={style}
      onClick={(event) => {
        if (isDragging) {
          event.stopPropagation();
          return;
        }
        onClick?.(event);
      }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        p: 1, mb: 0.75, borderRadius: 2,
        border: '1px solid', borderColor: 'divider',
        bgcolor: isCurrent ? 'action.selected' : 'background.paper',
        cursor: 'pointer',
        '&:hover': { bgcolor: 'action.hover' },
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        onClick={(event) => event.stopPropagation()}
        sx={{ cursor: 'grab', display: 'flex', color: 'text.disabled', touchAction: 'none' }}
      >
        <DragIndicatorRoundedIcon fontSize="small" />
      </Box>
      <Avatar variant="rounded" src={track.coverUrl || undefined} sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
        <MusicNoteRoundedIcon fontSize="small" />
      </Avatar>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: isCurrent ? 700 : 500 }}>
          {track.title || 'Untitled'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {artistLabel}
        </Typography>
      </Box>
      {isCurrent ? (
        <Chip label="Now playing" size="small" variant="outlined" />
      ) : (
        <Tooltip title="Remove from queue">
          <span>
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onRemove?.();
              }}
              sx={{ ml: 'auto', flexShrink: 0 }}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      )}
    </Box>
  );
}

// Shuffle / prev / play-pause / next / repeat — the five-button transport
// row. Shared between the compact desktop/tablet bar and the full-screen
// mobile player so the dispatch logic exists in exactly one place; only
// sizing differs between the two contexts.
function TransportControls({ dispatch, isPlaying, shuffle, repeat, hasNext, size = 'small', playSize = 'medium' }) {
  return (
    <>
      <Tooltip title={shuffle ? 'Shuffle on' : 'Shuffle'}>
        <IconButton
          onClick={() => dispatch(toggleShuffle())}
          aria-label="Shuffle"
          aria-pressed={shuffle}
          size={size}
          sx={{ color: shuffle ? 'primary.main' : 'text.secondary' }}
        >
          <ShuffleRoundedIcon fontSize={size} />
        </IconButton>
      </Tooltip>

      <IconButton onClick={() => dispatch(prev())} aria-label="Previous track" size={size}>
        <SkipPreviousRoundedIcon fontSize={playSize === 'large' ? 'large' : 'medium'} />
      </IconButton>

      <IconButton
        onClick={() => dispatch(togglePlay())}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        size={playSize}
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': { bgcolor: 'primary.dark' },
        }}
      >
        {isPlaying
          ? <PauseRoundedIcon fontSize={playSize === 'large' ? 'large' : 'medium'} />
          : <PlayArrowRoundedIcon fontSize={playSize === 'large' ? 'large' : 'medium'} />}
      </IconButton>

      <IconButton onClick={() => dispatch(next())} aria-label="Next track" size={size} disabled={!hasNext}>
        <SkipNextRoundedIcon fontSize={playSize === 'large' ? 'large' : 'medium'} />
      </IconButton>

      <Tooltip title={repeat === 'one' ? 'Repeat one' : repeat === 'all' ? 'Repeat all' : 'Repeat'}>
        <IconButton
          onClick={() => dispatch(cycleRepeat())}
          aria-label="Repeat"
          aria-pressed={repeat !== 'off'}
          size={size}
          sx={{ color: repeat !== 'off' ? 'primary.main' : 'text.secondary' }}
        >
          {repeat === 'one'
            ? <RepeatOneRoundedIcon fontSize={size} />
            : <RepeatRoundedIcon fontSize={size} />}
        </IconButton>
      </Tooltip>
    </>
  );
}

// Time label — slider — time label. Same reuse reasoning as TransportControls.
function SeekRow({ dispatch, progress, duration }) {
  return (
    <>
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
    </>
  );
}

// The queue list — the same DndContext/sortable list used by both the
// desktop Popover and the mobile full-screen player's inline panel.
function QueueList({ queue, index, sensors, onDragEnd, onPlayItem, onRemoveItem }) {
  if (queue.length === 0) {
    return <Typography variant="body2" color="text.secondary">Nothing queued yet.</Typography>;
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={queue.map((item, idx) => String(item.id ?? `${item.title ?? 'track'}-${idx}`))} strategy={verticalListSortingStrategy}>
        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {queue.map((item, idx) => (
            <SortableQueueTrack
              key={String(item.id ?? `${item.title ?? 'track'}-${idx}`)}
              track={item}
              index={idx}
              isCurrent={idx === index}
              onClick={() => onPlayItem(idx)}
              onRemove={() => onRemoveItem(idx)}
            />
          ))}
        </Box>
      </SortableContext>
    </DndContext>
  );
}

// The compact bar shown below `sm` — cover, title/artist, and ONLY a
// play/pause button. Everything else (shuffle, prev, next, repeat, seek,
// queue) lives one tap away in the full-screen player. A thin progress line
// along the top edge gives at-a-glance position without needing the full
// Slider, which has no room here.
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

// The expanded mobile experience — full cover art, all transport controls at
// a size actually meant for a thumb, the seek bar, and the queue inline
// (not a Popover: a Popover anchored to a button inside an open, focus-
// trapping Dialog is a stacking/focus fight waiting to happen — an inline
// collapsible section sidesteps that entirely and reads naturally as a
// second "screen" within the same sheet, closer to how a phone player
// actually behaves).
function FullScreenPlayer({
  open, onClose, current, isPlaying, progress, duration, repeat, shuffle, hasNext,
  liked, likeBusy, onToggleLike, dispatch, queue, index, sensors, onDragEnd,
  onPlayItem, onRemoveItem,
}) {
  const [showQueue, setShowQueue] = useState(false);

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      // Re-check the queue panel closed each time the sheet opens fresh —
      // walking back into "now playing" shouldn't reopen wherever the queue
      // was left last time.
      TransitionProps={{ onExited: () => setShowQueue(false) }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', p: 3 }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <IconButton onClick={onClose} aria-label="Minimize player">
            <KeyboardArrowDownRoundedIcon />
          </IconButton>
          <Typography variant="overline" color="text.secondary">Now playing</Typography>
          <Tooltip title="Up next">
            <IconButton
              onClick={() => setShowQueue((v) => !v)}
              aria-label="Queue"
              aria-pressed={showQueue}
              sx={{ color: showQueue ? 'primary.main' : 'text.secondary' }}
            >
              <QueueMusicRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {showQueue ? (
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Up next</Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary">
                  {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
                </Typography>
                <Button size="small" onClick={() => dispatch(clearQueue())} disabled={queue.length <= 1}>Clear</Button>
              </Stack>
            </Stack>
            <QueueList
              queue={queue} index={index} sensors={sensors}
              onDragEnd={onDragEnd} onPlayItem={onPlayItem} onRemoveItem={onRemoveItem}
            />
          </Box>
        ) : (
          <>
            <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              <Avatar
                variant="rounded"
                src={current.coverUrl || undefined}
                sx={{
                  bgcolor: 'primary.main', color: 'primary.contrastText',
                  width: '100%', height: '100%', maxWidth: 360, maxHeight: 360,
                  aspectRatio: '1 / 1', borderRadius: 3, boxShadow: 6,
                }}
              >
                <MusicNoteRoundedIcon sx={{ fontSize: 96 }} />
              </Avatar>
            </Box>

            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 3, mb: 1 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>{current.title}</Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {current.artist?.stageName ?? 'Unknown artist'}
                </Typography>
              </Box>
              <Tooltip title={liked ? 'Unlike' : 'Like'}>
                <IconButton
                  onClick={() => onToggleLike()}
                  disabled={likeBusy}
                  aria-label={liked ? 'Unlike current track' : 'Like current track'}
                  aria-pressed={liked}
                  sx={{ color: liked ? 'error.main' : 'text.secondary', flexShrink: 0 }}
                >
                  {liked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
                </IconButton>
              </Tooltip>
            </Stack>

            <Stack direction="row" sx={{ alignItems: 'center', width: '100%', mb: 2 }}>
              <SeekRow dispatch={dispatch} progress={progress} duration={duration} />
            </Stack>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <TransportControls
                dispatch={dispatch} isPlaying={isPlaying} shuffle={shuffle} repeat={repeat}
                hasNext={hasNext} size="medium" playSize="large"
              />
            </Stack>
          </>
        )}
      </Box>
    </Dialog>
  );
}

export default function NowPlayingBar() {
  const dispatch = useDispatch();
  const { current, isPlaying, progress, duration, repeat, shuffle, order, orderPos, queue, index } =
    useSelector((s) => s.player);
  const { sidebarHidden, playbarHidden, togglePlaybar } = useSidebar();
  const [queueAnchorEl, setQueueAnchorEl] = useState(null);
  const [fullPlayerOpen, setFullPlayerOpen] = useState(false);

  const { liked, busy: likeBusy, toggleLike } = useSocialSong(current?.id);

  const drawerWidth = sidebarHidden ? SIDEBAR_RAIL_WIDTH : SIDEBAR_FULL_WIDTH;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasNext =
    orderPos >= 0 &&
    (repeat === 'all' || orderPos < order.length - 1);

  const onQueueDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = queue.findIndex((item) => String(item.id ?? `${item.title ?? ''}-${item.artist ?? ''}`) === String(active.id));
    const to = queue.findIndex((item) => String(item.id ?? `${item.title ?? ''}-${item.artist ?? ''}`) === String(over.id));
    if (from < 0 || to < 0 || from === to) return;
    dispatch(reorderQueue({ fromIndex: from, toIndex: to }));
  };

  const playQueueItem = (itemIndex) => {
    dispatch(playFromQueue({ queue, index: itemIndex }));
    setQueueAnchorEl(null);
  };

  const removeQueueItem = (itemIndex) => {
    dispatch(removeFromQueue(itemIndex));
  };

  const clearQueueList = () => {
    dispatch(clearQueue());
    setQueueAnchorEl(null);
  };

  const queueOpen = Boolean(queueAnchorEl);

  if (!current) return null;
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

  return (
    <>
      <Paper
        elevation={8}
        square
        sx={{
          position: 'fixed',
          left: { xs: 0, md: `${drawerWidth}px` },
          right: 0, bottom: 0,
          // Pinned so AppLayout's bottom padding can trust PLAYBAR_HEIGHT. If this
          // box could grow, the padding would be a guess again. Same height for
          // both the mini bar and the full bar — only the full-screen player
          // (a separate Dialog, not this Paper) breaks that rule, and it doesn't
          // need to respect it since it covers the whole viewport anyway.
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
        {/* Below sm: compact bar, taps open the full-screen player. */}
        <Box sx={{ display: { xs: 'flex', sm: 'none' }, width: '100%' }}>
          <MiniPlayerBar
            current={current}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            onTogglePlay={() => dispatch(togglePlay())}
            onExpand={() => setFullPlayerOpen(true)}
          />
        </Box>

        {/* sm and up: the full control bar, unchanged from before. */}
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
                onDragEnd={onQueueDragEnd} onPlayItem={playQueueItem} onRemoveItem={removeQueueItem}
              />
            </Box>
          </Popover>

          <SeekRow dispatch={dispatch} progress={progress} duration={duration} />

          <Tooltip title="Hide player">
            <IconButton onClick={togglePlaybar} aria-label="Hide player" size="small">
              <KeyboardArrowDownRoundedIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      <FullScreenPlayer
        open={fullPlayerOpen}
        onClose={() => setFullPlayerOpen(false)}
        current={current}
        isPlaying={isPlaying}
        progress={progress}
        duration={duration}
        repeat={repeat}
        shuffle={shuffle}
        hasNext={hasNext}
        liked={liked}
        likeBusy={likeBusy}
        onToggleLike={toggleLike}
        dispatch={dispatch}
        queue={queue}
        index={index}
        sensors={sensors}
        onDragEnd={onQueueDragEnd}
        onPlayItem={playQueueItem}
        onRemoveItem={removeQueueItem}
      />
    </>
  );
}