import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import {
  Box, Typography, Stack, Alert, Skeleton, Paper, IconButton, Tooltip, Chip, Button,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { fetchPlaylist, removeTrack, moveTrack, updatePlaylist } from '../api/playlist';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import { PLAYLISTS } from '../constants/route_constant';

const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

function SortableTrack({ track, index, onPlay, onRemove, isPlaying, isLoaded, busy }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: track.playlistSongId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <Paper
      ref={setNodeRef}
      style={style}
      variant="outlined"
      sx={{
        p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5,
        bgcolor: isLoaded ? 'action.selected' : 'background.paper',
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: 'grab', display: 'flex', color: 'text.disabled',
          touchAction: 'none',   // stop the browser scrolling instead of dragging on touch
          '&:active': { cursor: 'grabbing' },
        }}
      >
        <DragIndicatorRoundedIcon />
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ width: 24, textAlign: 'right' }}>
        {index + 1}
      </Typography>

      <IconButton size="small" onClick={onPlay} disabled={busy}>
        {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
      </IconButton>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
          {track.song?.title || 'Unknown'}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {track.song?.artist?.stageName || 'Unknown artist'}
        </Typography>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
        {fmtDuration(track.song?.durationSeconds)}
      </Typography>

      <Tooltip title="Remove from playlist">
        <span>
          <IconButton size="small" onClick={onRemove} disabled={busy} sx={{ flexShrink: 0 }}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
}

export default function PlaylistPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [playlist, setPlaylist] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  // Owner-only: whether the caller owns this playlist (drives the visibility
  // toggle) and whether a public/private write is in flight (locks the chip so a
  // double-click can't fire two conflicting PATCHes).
  const [isOwner, setIsOwner] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);

  const loadedId = useSelector((s) => s.player.current?.id);
  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));

  // The pointer sensor needs a small activation distance. Without it, a plain
  // CLICK on the handle registers as a zero-distance drag, and dnd-kit swallows
  // the click event. 6px means "you have to actually move to be dragging".
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErr('');
    try {
      const data = await fetchPlaylist(id, { page: 1, limit: 200 });
      // GET /playlists/:id returns { playlist, tracks, pagination, isOwner }.
      // tracks is a plain array of { playlistSongId, position, song }.
      setPlaylist(data.playlist);
      setTracks(data.tracks ?? []);
      // GET /playlists/:id already tells us whether the caller owns it. Only the
      // owner gets the interactive visibility toggle; a viewer of a PUBLIC
      // playlist still sees the chip, just read-only.
      setIsOwner(Boolean(data.isOwner));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // The queue shape the player expects: { id, title, artist, coverUrl }.
  const toQueue = (list) => list.map((t) => ({
    id: t.song?.id,
    title: t.song?.title,
    artist: t.song?.artist?.stageName || 'Unknown artist',
    coverUrl: t.song?.coverUrl ?? null,
  }));

  const play = (idx) => {
    const songId = tracks[idx]?.song?.id;
    if (!songId) return;
    if (loadedId === songId) dispatch(togglePlay());
    else dispatch(playFromQueue({ queue: toQueue(tracks), index: idx }));
  };

  // ── The drop handler. This is the whole feature. ────────────────────────────
  const onDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;   // dropped on itself, or outside

    const from = tracks.findIndex((t) => t.playlistSongId === active.id);
    const to = tracks.findIndex((t) => t.playlistSongId === over.id);
    if (from === -1 || to === -1) return;

    const previous = tracks;                       // keep it, so we can roll back
    const reordered = arrayMove(tracks, from, to);

    // OPTIMISTIC. Reorder locally first so the row lands where the finger let go,
    // with no network round-trip in between. Waiting for the server would make the
    // row visibly snap back and then jump — which reads as a bug even when it works.
    setTracks(reordered);
    setBusy(true);
    setErr('');

    // The backend speaks "after WHICH row", not "at index N" — that's what makes
    // fractional positioning work (insert between two neighbours by taking their
    // midpoint; no other row gets rewritten). So we translate the new index into
    // the id of whatever now sits ABOVE it. Landing at the top means "after
    // nothing", which is null.
    const newIdx = reordered.findIndex((t) => t.playlistSongId === active.id);
    const afterId = newIdx === 0 ? null : reordered[newIdx - 1].playlistSongId;

    try {
      const res = await moveTrack(id, active.id, afterId);

      // The backend hands back `rebalanced: true` when the fractional gaps got so
      // small it had to renumber EVERY row. When that happens our local positions
      // are stale, so we refetch rather than trust them. This is why the flag
      // exists — it's the one case where optimism is wrong.
      if (res?.rebalanced) await load({ silent: true });
    } catch (e) {
      setTracks(previous);   // roll back to exactly what the user saw before
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  // Flip public <-> private. Optimistic, same as the reorder/remove handlers:
  // the chip changes the instant it's clicked, and only rolls back if the PATCH
  // fails — so the common (successful) case has no visible network lag.
  const toggleVisibility = async () => {
    if (!isOwner || togglingVisibility || !playlist) return;

    const previous = playlist;
    const nextPublic = !playlist.isPublic;

    setPlaylist({ ...playlist, isPublic: nextPublic }); // optimistic flip
    setTogglingVisibility(true);
    setErr('');
    try {
      // Backend is the source of truth — take isPublic from its response rather
      // than trusting our optimistic guess, in case anything normalises it.
      const updated = await updatePlaylist(id, { isPublic: nextPublic });
      setPlaylist((cur) => ({ ...cur, isPublic: updated.isPublic }));
    } catch (e) {
      setPlaylist(previous); // roll back to exactly what the user saw
      setErr(e.message);
    } finally {
      setTogglingVisibility(false);
    }
  };

  const remove = async (playlistSongId) => {
    const previous = tracks;
    setTracks(tracks.filter((t) => t.playlistSongId !== playlistSongId));  // optimistic again
    setBusy(true);
    try {
      await removeTrack(id, playlistSongId);
    } catch (e) {
      setTracks(previous);
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Stack spacing={1.5}>
        <Skeleton variant="rounded" height={120} />
        {[...Array(6)].map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
      </Stack>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate(PLAYLISTS)}
        sx={{ mb: 2 }}
      >
        Playlists
      </Button>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 96, height: 96, borderRadius: 3, flexShrink: 0,
            background: `linear-gradient(135deg, hsl(${Math.round(Number(id) * 137.508) % 360} 55% 45%), hsl(${(Math.round(Number(id) * 137.508) + 50) % 360} 60% 35%))`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <QueueMusicRoundedIcon sx={{ fontSize: 40, color: 'rgba(255,255,255,.85)' }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }} noWrap>
              {playlist?.title}
            </Typography>
            {isOwner ? (
              <Tooltip
                title={
                  playlist?.isPublic
                    ? 'Public — anyone can view it. Click to make private.'
                    : 'Private — only you can see it. Click to make public.'
                }
              >
                <Chip
                  size="small"
                  clickable
                  onClick={toggleVisibility}
                  color={playlist?.isPublic ? 'success' : 'default'}
                  icon={playlist?.isPublic ? <PublicRoundedIcon /> : <LockRoundedIcon />}
                  label={playlist?.isPublic ? 'Public' : 'Private'}
                  variant="outlined"
                  sx={{ opacity: togglingVisibility ? 0.6 : 1 }}
                />
              </Tooltip>
            ) : (
              <Chip
                size="small"
                icon={playlist?.isPublic ? <PublicRoundedIcon /> : <LockRoundedIcon />}
                label={playlist?.isPublic ? 'Public' : 'Private'}
                variant="outlined"
              />
            )}
          </Stack>
          {playlist?.description && (
            <Typography variant="body2" color="text.secondary">{playlist.description}</Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} · drag the handle to reorder
          </Typography>
        </Box>
      </Stack>

      {tracks.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}
        >
          <QueueMusicRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>This playlist is empty</Typography>
          <Typography variant="body2" color="text.secondary">
            Add songs to it from Browse.
          </Typography>
        </Paper>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={tracks.map((t) => t.playlistSongId)}
            strategy={verticalListSortingStrategy}
          >
            <Stack spacing={1}>
              {tracks.map((t, i) => (
                <SortableTrack
                  key={t.playlistSongId}
                  track={t}
                  index={i}
                  busy={busy}
                  isLoaded={loadedId === t.song?.id}
                  isPlaying={playingId === t.song?.id}
                  onPlay={() => play(i)}
                  onRemove={() => remove(t.playlistSongId)}
                />
              ))}
            </Stack>
          </SortableContext>
        </DndContext>
      )}
    </Box>
  );
}