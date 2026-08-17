import { useMemo } from 'react';
import {
  Box, Typography, IconButton, Slider, Avatar, Tooltip, Chip,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import ShuffleRoundedIcon from '@mui/icons-material/ShuffleRounded';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
import RepeatOneRoundedIcon from '@mui/icons-material/RepeatOneRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useDispatch, useSelector } from 'react-redux';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  togglePlay, requestSeek, next, prev, cycleRepeat, toggleShuffle,
  reorderQueue, removeFromQueue, clearQueue, playFromQueue,
} from '../../store/slices/playerSlice';

// mm:ss for a seconds value. Guards against null/negative.
export const fmt = (secs) => {
  if (!secs || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

// A stable dnd id for a queue row — the song id, or a title/index fallback for
// the (rare) track with no id.
const rowId = (track, index) =>
  String(track.id ?? `${track.title ?? 'track'}-${index}`);

const artistLabelOf = (track) =>
  typeof track.artist === 'string'
    ? track.artist
    : track.artist?.stageName || track.artist?.name || 'Unknown artist';

function SortableQueueTrack({ track, index, isCurrent, onClick, onRemove }) {
  const id = rowId(track, index);
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

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
          {artistLabelOf(track)}
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

// Shuffle / prev / play-pause / next / repeat — the five-button transport row.
// Shared by the compact bar, the focused overlay, and (a subset of) the PIP card.
export function TransportControls({ dispatch, isPlaying, shuffle, repeat, hasNext, size = 'small', playSize = 'medium' }) {
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

// Time label — slider — time label.
export function SeekRow({ dispatch, progress, duration }) {
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

// The queue list — the same DndContext/sortable list used by the desktop
// Popover and the focused overlay's inline panel.
export function QueueList({ queue, index, sensors, onDragEnd, onPlayItem, onRemoveItem }) {
  if (queue.length === 0) {
    return <Typography variant="body2" color="text.secondary">Nothing queued yet.</Typography>;
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={queue.map((item, idx) => rowId(item, idx))} strategy={verticalListSortingStrategy}>
        <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
          {queue.map((item, idx) => (
            <SortableQueueTrack
              key={rowId(item, idx)}
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

export function usePlayerQueueControls() {
  const dispatch = useDispatch();
  const { queue, index, order, orderPos, repeat } = useSelector((s) => s.player);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const hasNext = useMemo(
    () => orderPos >= 0 && (repeat === 'all' || orderPos < order.length - 1),
    [orderPos, repeat, order.length]
  );

  const onDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const key = (item, idx) => rowId(item, idx);
    const from = queue.findIndex((item, idx) => key(item, idx) === String(active.id));
    const to = queue.findIndex((item, idx) => key(item, idx) === String(over.id));
    if (from < 0 || to < 0 || from === to) return;
    dispatch(reorderQueue({ fromIndex: from, toIndex: to }));
  };

  const playItem = (itemIndex) => dispatch(playFromQueue({ queue, index: itemIndex }));
  const removeItem = (itemIndex) => dispatch(removeFromQueue(itemIndex));
  const clear = () => dispatch(clearQueue());

  return { queue, index, sensors, hasNext, onDragEnd, playItem, removeItem, clear };
}