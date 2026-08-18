import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Avatar, Chip, Button,
  List, ListItemButton, ListItemAvatar, ListItemText, IconButton, Tooltip, Link,
  CircularProgress, TextField, InputAdornment, ToggleButton, ToggleButtonGroup,
  Tabs, Tab,
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
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import GavelRoundedIcon from '@mui/icons-material/GavelRounded';
import { useSelector, useDispatch } from 'react-redux';
import MediaCardShell from '../components/MediaCardShell';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import { fetchMyCatalog, setSongStatus, setAlbumStatus, deleteSong, deleteAlbum } from '../api/catalog';
import DeleteCatalogItemDialog from '../components/DeleteCatalogItemDialog';
import LyricsAction from '../components/LyricsAction';
import { UPLOAD, BROWSE } from '../constants/route_constant';
import { useAuth } from '../store/hooks/useAuth';
import { PERMISSIONS } from '../auth/permissions';
import SearchField from '../components/SearchField';

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

// Case-insensitive substring match. Deliberately dumb — this filters an array
// that's ALREADY in memory, so there's no query to optimize.
const matches = (haystack, needle) =>
  String(haystack || '').toLowerCase().includes(needle);

export default function MyCatalogPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { can, user } = useAuth();

  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);       // FIRST load only
  const [refreshing, setRefreshing] = useState(false); // background refetch
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);   // which row is mid-write
  const [hoverId, setHoverId] = useState(null);  // which album card is hovered (toggle reveal)
  const [pendingDelete, setPendingDelete] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' = all

  const [contentTab, setContentTab] = useState('albums');

  const isSuperAdmin = user?.role === 'Super Admin';
  const canUpload = can(PERMISSIONS.UPLOAD_SONGS) && !isSuperAdmin;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      setData(await fetchMyCatalog());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);   // first mount -> full skeleton

  const needle = search.trim().toLowerCase();

  const albums = useMemo(() => {
    const all = data?.albums || [];
    return all.filter((a) =>
      (!statusFilter || a.status === statusFilter) &&
      (!needle || matches(a.title, needle))
    );
  }, [data, needle, statusFilter]);

  const songs = useMemo(() => {
    const all = data?.songs || [];
    return all.filter((s) =>
      (!statusFilter || s.status === statusFilter) &&
      (!needle || matches(s.title, needle) || matches(s.album?.title, needle))
    );
  }, [data, needle, statusFilter]);

  const isFiltered = Boolean(needle || statusFilter);

  const tracks = songs.map((s) => ({
    id: s.id, title: s.title,
    artist: s.artist ?? null,
    coverUrl: s.coverUrl ?? null,
  }));

  const onPlaySong = (idx) => {
    const track = tracks[idx];
    if (loadedId === track.id) dispatch(togglePlay());
    else dispatch(playFromQueue({ queue: tracks, index: idx }));
  };

  const changeSongStatus = async (song, next) => {
    setBusyId(`song-${song.id}`);
    try { await setSongStatus(song.id, next); await load({ silent: true }); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

  const changeAlbumStatus = async (album, next) => {
    setBusyId(`album-${album.id}`);
    try { await setAlbumStatus(album.id, next); await load({ silent: true }); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

 const confirmDelete = async (password) => {
    if (!pendingDelete) return;
    const { kind, item } = pendingDelete;
    if (kind === 'album') await deleteAlbum(item.id, password);
    else await deleteSong(item.id, password);
    await load({ silent: true });
  };

  const songsInAlbum = (albumId) =>
    (data?.songs || []).filter((s) => s.albumId === albumId).length;

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
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Your library is empty
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {canUpload
            ? 'Set up your artist profile and upload your first track to see it here.'
            : 'Oops! It is empty here. Head to Browse to explore the catalog.'}
        </Typography>
        {canUpload ? (
          <Button variant="contained" startIcon={<CloudUploadRoundedIcon />}
            onClick={() => navigate(UPLOAD)}>
            Go to Artist Studio
          </Button>
        ) : (
          <Button variant="contained" startIcon={<QueueMusicRoundedIcon />}
            onClick={() => navigate(BROWSE)}>
            Browse music
          </Button>
        )}
      </Box>
    );
  }

  const songActions = (s) => {
    const busy = busyId === `song-${s.id}`;

    const deleteBtn = (
      <Tooltip title="Delete permanently">
        <span>
          <IconButton size="small" color="error" disabled={busy}
            onClick={(e) => { e.stopPropagation(); setPendingDelete({ kind: 'song', item: s }); }}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    );

    if (s.isLocked) {
      return (
        <>
          <Tooltip title="Removed by a moderator. Contact an admin to appeal.">
            <GavelRoundedIcon fontSize="small" sx={{ color: 'error.main', mr: 0.5 }} />
          </Tooltip>
          {deleteBtn}
        </>
      );
    }

    if (s.status === 'archived') {
      return (
        <>
          <Tooltip title="Restore to published">
            <span>
              <IconButton size="small" disabled={busy}
                onClick={(e) => { e.stopPropagation(); changeSongStatus(s, 'published'); }}>
                {busy ? <CircularProgress size={16} /> : <UnarchiveRoundedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <LyricsAction song={s} />
          {deleteBtn}
        </>
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
              {busy ? <CircularProgress size={16} color="inherit" /> : <Inventory2RoundedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
        <LyricsAction song={s} />
        {deleteBtn}
      </>
    );
  };

  // Status toggle — an icon-only frosted "liquid-glass" pill that fades in on card hover. draft -> publish, published -> archive, archived -> republish.
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
            // hover-reveal; stays clickable once shown. Mid-write, force it
            // visible — otherwise the spinner vanishes the moment the pointer
            // drifts off the card.
            opacity: visible || busy ? 1 : 0,
            pointerEvents: visible || busy ? 'auto' : 'none',
            transform: visible || busy ? 'scale(1)' : 'scale(0.9)',
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
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'center' }, mb: 2 }}>
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Your Library</Typography>
            {/* A quiet spinner while a status write settles — the page no longer
                blanks, so this is the only hint that a refetch is in flight. */}
            {refreshing && <CircularProgress size={16} />}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Everything you've created: your drafts, published, and archived
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
          sx={{ alignItems: { sm: 'center' } }}>
          <SearchField
            placeholder="Search your catalog…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            sx={{ width: { xs: '100%', sm: 240 } }}
          />

          <ToggleButtonGroup
            size="small"
            exclusive
            value={statusFilter}
            onChange={(_, v) => setStatusFilter(v ?? '')}
            aria-label="filter by status"
          >
            <ToggleButton value="">All</ToggleButton>
            <ToggleButton value="draft">Drafts</ToggleButton>
            <ToggleButton value="published">Live</ToggleButton>
            <ToggleButton value="archived">Archived</ToggleButton>
          </ToggleButtonGroup>

          {canUpload && (
            <Button variant="outlined" startIcon={<CloudUploadRoundedIcon />}
              onClick={() => navigate(UPLOAD)} sx={{ whiteSpace: 'nowrap' }}>
              Upload
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Counts live in the tab labels so the filtered/total split is visible
          on BOTH tabs at once — you can see the songs tab has matches without
          leaving the albums tab. */}
      <Tabs
        value={contentTab}
        onChange={(_, value) => setContentTab(value)}
        sx={{ mt: 3, mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          value="albums"
          label={`Albums (${isFiltered ? `${albums.length} of ${data.albums.length}` : data.albums.length})`}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        />
        <Tab
          value="songs"
          label={`Songs (${isFiltered ? `${songs.length} of ${data.songs.length}` : data.songs.length})`}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        />
      </Tabs>

      {contentTab === 'albums' && (
        <>
      {albums.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {isFiltered
            ? `No albums match your filters.${songs.length > 0 ? ` ${songs.length} song${songs.length === 1 ? '' : 's'} matched — check the Songs tab.` : ''}`
            : 'No albums yet.'}
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {albums.map((a) => {
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
                <MediaCardShell
                  bare
                  variant="album"
                  seed={a.id}
                  imageUrl={a.coverUrl || undefined}
                  title={a.title}
                  onClick={() => navigate(`/album/${a.publicId ?? a.id}`)}
                />

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

                  <Stack direction="row" spacing={0.5}
                    sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 0.5, minHeight: 32 }}>
                    <Stack direction="row" spacing={0.5}
                      sx={{ alignItems: 'center', color: 'text.disabled', flex: 1, minWidth: 0 }}>
                      <CalendarMonthRoundedIcon sx={{ fontSize: 14, flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ lineHeight: 1.3 }}>
                        {released || 'No release date'}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                      {albumToggle(a, hoverId === a.id)}
                      <Tooltip title="Delete album permanently">
                        <IconButton
                          size="small"
                          aria-label="Delete album permanently"
                          onClick={() => setPendingDelete({ kind: 'album', item: a })}
                          sx={(t) => ({
                            width: 30, height: 30,
                            color: 'error.main',
                            bgcolor: alpha(t.palette.error.main, 0.14),
                            border: `1px solid ${alpha(t.palette.error.main, 0.35)}`,
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            opacity: hoverId === a.id ? 1 : 0,
                            pointerEvents: hoverId === a.id ? 'auto' : 'none',
                            transform: hoverId === a.id ? 'scale(1)' : 'scale(0.9)',
                            transition: 'opacity .18s ease, transform .18s ease, background-color .18s ease',
                            '&:hover': {
                              bgcolor: alpha(t.palette.error.main, 0.24),
                              border: `1px solid ${alpha(t.palette.error.main, 0.5)}`,
                            },
                          })}
                        >
                          <DeleteOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
        </>
      )}

      {contentTab === 'songs' && (
        <>
      {songs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {isFiltered
            ? `No songs match your filters.${albums.length > 0 ? ` ${albums.length} album${albums.length === 1 ? '' : 's'} matched — check the Albums tab.` : ''}`
            : 'No songs yet.'}
        </Typography>
      ) : (
        <List>
          {songs.map((s, idx) => {
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
                        onClick={(e) => { e.stopPropagation(); navigate(`/album/${s.album.publicId ?? s.album.id}`); }}>
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
        </>
      )}

      <DeleteCatalogItemDialog
      requirePassword
        open={Boolean(pendingDelete)}
        kind={pendingDelete?.kind}
        target={pendingDelete?.item}
        songsAtRisk={
          pendingDelete?.kind === 'album' ? songsInAlbum(pendingDelete.item.id) : 0
        }
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}