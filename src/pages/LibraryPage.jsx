import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Avatar, Chip, Divider, Button,
  List, ListItemButton, ListItemAvatar, ListItemText, IconButton, Tooltip, Link,
  alpha,
} from '@mui/material';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import { useSelector, useDispatch } from 'react-redux';
import MediaCard from '../components/MediaCard';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import { fetchMyCatalog, setSongStatus, setAlbumStatus } from '../api/catalog';
import { UPLOAD } from '../constants/route_constant';

const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// pretty-print a YYYY-MM-DD release date. Returns null (not a dash) when absent
// so callers can choose whether to render the row at all.
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const statusColor = (status) =>
  status === 'published' ? 'success' : status === 'archived' ? 'default' : 'warning';

export default function LibraryPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);   // which row is mid-write
  const [hoverId, setHoverId] = useState(null);  // which album card is hovered (toggle reveal)

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      setData(await fetchMyCatalog());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const tracks = (data?.songs || []).map((s) => ({
    id: s.id, title: s.title,
    artist: s.artist ?? null,
    coverUrl: s.coverUrl ?? null,
  }));

  const onPlaySong = (idx) => {
    const track = tracks[idx];
    if (loadedId === track.id) dispatch(togglePlay());
    else dispatch(playFromQueue({ queue: tracks, index: idx }));
  };

  // Owner status change on MY song. The backend route is owner-gated, so this
  // only ever touches songs I own — an artist archiving/publishing their own.
  const changeSongStatus = async (song, next) => {
    setBusyId(`song-${song.id}`);
    try { await setSongStatus(song.id, next); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

  // Album status change cascades to tracks on the backend (publish -> draft
  // tracks published; archive -> all tracks archived).
  const changeAlbumStatus = async (album, next) => {
    setBusyId(`album-${album.id}`);
    try { await setAlbumStatus(album.id, next); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

  if (loading) {
    return (
      <Box sx={{ pb: 12 }}>
        <Skeleton width="30%" height={40} sx={{ mb: 2 }} />
        <Stack direction="row" spacing={2}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={190} height={280} sx={{ borderRadius: 3 }} />
          ))}
        </Stack>
      </Box>
    );
  }

  if (err) {
    return <Box sx={{ pb: 12 }}><Alert severity="error">{err}</Alert></Box>;
  }

  if (!data?.isArtist) {
    return (
      <Box sx={{ pb: 12, textAlign: 'center', py: 8 }}>
        <LibraryMusicRoundedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Your library is empty</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Become an artist and upload your first track to see it here.
        </Typography>
        <Button variant="contained" startIcon={<CloudUploadRoundedIcon />}
          onClick={() => navigate(UPLOAD)}>
          Go to Artist Studio
        </Button>
      </Box>
    );
  }

  // Per-song action buttons keyed off current status.
  const songActions = (s) => {
    const busy = busyId === `song-${s.id}`;
    if (s.status === 'archived') {
      return (
        <Tooltip title="Restore to published">
          <span>
            <IconButton size="small" disabled={busy}
              onClick={(e) => { e.stopPropagation(); changeSongStatus(s, 'published'); }}>
              <UnarchiveRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      );
    }
    return (
      <>
        {s.status === 'draft' && (
          <Tooltip title="Publish">
            <span>
              <IconButton size="small" disabled={busy}
                onClick={(e) => { e.stopPropagation(); changeSongStatus(s, 'published'); }}>
                <PublishRoundedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
        <Tooltip title="Archive">
          <span>
            <IconButton size="small" color="warning" disabled={busy}
              onClick={(e) => { e.stopPropagation(); changeSongStatus(s, 'archived'); }}>
              <Inventory2RoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </>
    );
  };

  // Status toggle — an icon-only frosted "liquid-glass" pill that fades in on
  // card hover. draft -> publish, published -> archive, archived -> republish.
  const albumToggle = (a, visible) => {
    const busy = busyId === `album-${a.id}`;

    const map = {
      draft:     { title: 'Publish album',   icon: <PublishRoundedIcon fontSize="small" />,   next: 'published', role: 'success' },
      published: { title: 'Archive album',   icon: <Inventory2RoundedIcon fontSize="small" />, next: 'archived',  role: 'warning' },
      archived:  { title: 'Republish album', icon: <UnarchiveRoundedIcon fontSize="small" />,  next: 'published', role: 'success' },
    };
    const cfg = map[a.status] || map.draft;

    return (
      <Tooltip title={cfg.title}>
        <IconButton
          onClick={() => changeAlbumStatus(a, cfg.next)}
          disabled={busy}
          size="small"
          aria-label={cfg.title}
          sx={(t) => ({
            width: 30,
            height: 30,
            color: `${cfg.role}.main`,
            // frosted glass: translucent tint + blur + hairline highlight
            bgcolor: alpha(t.palette[cfg.role].main, 0.14),
            border: `1px solid ${alpha(t.palette[cfg.role].main, 0.35)}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.15)}`,
            // hover-reveal; stays clickable once shown. pointerEvents guards
            // against clicking an invisible button when the card isn't hovered.
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
            transform: visible ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity .18s ease, transform .18s ease, background-color .18s ease',
            '&:hover': {
              bgcolor: alpha(t.palette[cfg.role].main, 0.24),
              border: `1px solid ${alpha(t.palette[cfg.role].main, 0.5)}`,
            },
          })}
        >
          {busy ? <CircularProgress size={14} color="inherit" /> : cfg.icon}
        </IconButton>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ pb: 16 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Your Library</Typography>
          <Typography variant="body2" color="text.secondary">
            Everything you've created — drafts, published, and archived
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<CloudUploadRoundedIcon />}
          onClick={() => navigate(UPLOAD)}>
          Upload
        </Button>
      </Stack>

      {/* Albums */}
      <Typography variant="h6" sx={{ fontWeight: 700, mt: 3, mb: 1 }}>
        Albums ({data.albums.length})
      </Typography>
      {data.albums.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>No albums yet.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {data.albums.map((a) => {
            const released = fmtDate(a.releaseDate);
            return (
              <Box
                key={a.id}
                onMouseEnter={() => setHoverId(a.id)}
                onMouseLeave={() => setHoverId(null)}
                sx={{
                  width: 180,
                  borderRadius: 3,
                  overflow: 'hidden',              // one clip owns all four corners
                  border: 1,
                  borderColor: (t) => alpha(t.palette.text.primary, 0.12),
                  bgcolor: 'action.hover',
                  transition: 'border-color .18s ease',
                  '&:hover': { borderColor: (t) => alpha(t.palette.text.primary, 0.22) },
                }}
              >
                {/* Cover sits inside the clipped card as a bare element (no
                    border/shadow/radius of its own), so the outer card owns every
                    corner and there's no nested-card outline or seam. hideText
                    suppresses MediaCard's built-in labels. */}
                <MediaCard
                  seed={a.id}
                  imageUrl={a.coverUrl || undefined}
                  title={a.title}
                  hideText
                  bare
                  onClick={() => navigate(`/album/${a.id}`)}
                />

                {/* Meta — borderless now; the outer card owns the border and
                    corners. Title dominant; status + type + date recede. The icon
                    toggle sits on the date row and fades in on hover. */}
                <Box sx={{ p: 1.25 }}>
                  <Typography
                    variant="subtitle2"
                    noWrap
                    title={a.title}
                    sx={{ fontWeight: 700, lineHeight: 1.3 }}
                  >
                    {a.title}
                  </Typography>

                  <Stack direction="row" spacing={0.75}
                    sx={{ alignItems: 'center', mt: 0.5, color: 'text.secondary' }}>
                    <Box
                      component="span"
                      sx={(t) => {
                        const c = statusColor(a.status);
                        const isNeutral = c === 'default';
                        return {
                          px: 0.75, py: 0.125,
                          borderRadius: 1,
                          fontSize: 11, fontWeight: 600, lineHeight: 1.6,
                          textTransform: 'capitalize',
                          color: isNeutral ? 'text.secondary' : `${c}.main`,
                          bgcolor: isNeutral
                            ? t.palette.action.selected
                            : alpha(t.palette[c].main, 0.16),
                        };
                      }}
                    >
                      {a.status}
                    </Box>
                    <Typography variant="caption" noWrap>
                      {a.isSingle ? 'Single' : 'Album'}
                    </Typography>
                  </Stack>

                  {/* Date + hover-reveal toggle share a row. The date shows in
                      full; the icon toggle is fixed-width on the right. minHeight
                      keeps the row stable whether the toggle is shown. */}
                  <Stack direction="row" spacing={0.5}
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5, minHeight: 32 }}>
                    <Stack direction="row" spacing={0.5}
                      sx={{ alignItems: 'center', color: 'text.disabled', flex: 1, minWidth: 0 }}>
                      <CalendarMonthRoundedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ lineHeight: 1.3 }}>
                        {released || 'No release date'}
                      </Typography>
                    </Stack>
                    {albumToggle(a, hoverId === a.id)}
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Divider sx={{ mb: 1 }} />

      {/* Songs */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        Songs ({data.songs.length})
      </Typography>
      {data.songs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No songs yet.</Typography>
      ) : (
        <List>
          {data.songs.map((s, idx) => {
            const isThis = playingId === s.id;
            return (
              <ListItemButton key={s.id} onClick={() => onPlaySong(idx)} sx={{ borderRadius: 2 }}>
                <ListItemAvatar>
                  <Avatar variant="rounded" src={s.coverUrl || undefined}
                    sx={{ bgcolor: isThis ? 'primary.main' : 'action.selected' }}>
                    {isThis ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={s.title}
                  secondary={
                    s.album ? (
                      <Link component="button" variant="body2" underline="hover"
                        onClick={(e) => { e.stopPropagation(); navigate(`/album/${s.album.id}`); }}>
                        {s.album.title}
                      </Link>
                    ) : fmtDuration(s.durationSeconds)
                  }
                  slotProps={{ primary: { fontWeight: 600 } }}
                />
                <Chip size="small" label={s.status} color={statusColor(s.status)}
                  variant="outlined" sx={{ mr: 1, textTransform: 'capitalize' }} />
                {songActions(s)}
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}