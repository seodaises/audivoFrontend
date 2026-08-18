import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Avatar, Chip, Divider, Button,
  List, ListItemButton, ListItemAvatar, ListItemText, IconButton, Tooltip, Link,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem,
  LinearProgress, alpha, CircularProgress,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import AddToPlaylistDialog from '../components/AddToPlaylistDialog';
import CommentSection from '../components/CommentSection';
import ShareButton from '../components/ShareButton';
import SongLyricsButton from '../components/SongLyricsButton';
import ImagePicker from '../components/ImagePicker';
import { uploadAlbumCoverImage } from '../api/uploads';
import useSocialSong from '../store/hooks/useSocial';
import { useSelector, useDispatch } from 'react-redux';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import {
  fetchAlbum, updateAlbum, updateSong, setSongStatus, uploadSong, fetchGenres,
} from '../api/catalog';
import { useCoverAccentColor } from '../store/hooks/useCoverAccentColor';

const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// Compact play count: 0 -> "0", 1500 -> "1.5K", 3_000_000 -> "3M". Keeps a large
// stream total from stretching the tracklist row.
const fmtStreams = (n) => {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  if (v < 1_000_000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K`;
  return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
};

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const statusColor = (s) =>
  s === 'published' ? 'success' : s === 'archived' ? 'default' : 'warning';
function TrackLikeButton({ songId, title, visible }) {
  const { liked, busy, toggleLike } = useSocialSong(songId);
  return (
    <Tooltip title={liked ? 'Unlike' : 'Like'}>
      <span>
        <IconButton
          size="small"
          disabled={busy}
          aria-label={liked ? `Unlike ${title}` : `Like ${title}`}
          onClick={(e) => { e.stopPropagation(); toggleLike(); }}
          sx={{
            color: liked ? 'error.main' : 'inherit',
            opacity: liked || visible ? 1 : 0,
            pointerEvents: liked || visible ? 'auto' : 'none',
            transition: 'opacity .18s ease',
          }}
        >
          {liked ? <FavoriteRoundedIcon fontSize="small" /> : <FavoriteBorderRoundedIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default function AlbumPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [album, setAlbum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Called unconditionally (before the loading/error early-returns below) —
  // hooks can't be conditional. Resolves null until extraction succeeds, or
  // permanently if the cover's host blocks it; the hero falls back to the
  // original static gradient either way.
  const accentColor = useCoverAccentColor(album?.coverUrl || null);

  const [editAlbumOpen, setEditAlbumOpen] = useState(false);
  const [addSongOpen, setAddSongOpen] = useState(false);
  const [editSong, setEditSong] = useState(null);
  const [hoverId, setHoverId] = useState(null);   // which track row is hovered (toggle reveal)

  const [playlistSong, setPlaylistSong] = useState(null);
  const [commentSong, setCommentSong] = useState(null);
  const [highlightCommentId, setHighlightCommentId] = useState(null);
  const closeComments = useCallback(() => {
    setCommentSong(null);
    setHighlightCommentId(null);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      setAlbum(await fetchAlbum(id));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handledKeyRef = useRef(null);
  useEffect(() => {
    if (!album) return;
    if (handledKeyRef.current === location.key) return;
    const st = location.state;
    if (st && st.openCommentsForSongId) {
      handledKeyRef.current = location.key;
      const song = (album.songs || []).find(
        (s) => String(s.id) === String(st.openCommentsForSongId)
      );
      if (song) {
        setCommentSong(song);
        setHighlightCommentId(st.highlightCommentId ?? null);
      }
      // Clear the state so a refresh or back-nav doesn't reopen the dialog.
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [album, location, navigate]);

  const tracks = (album?.songs || []).map((s) => ({
    id: s.id, title: s.title,
    artist: album?.artist ?? null,
    coverUrl: album?.coverUrl ?? null,
  }));

  const onPlay = (idx) => {
    const track = tracks[idx];
    if (loadedId === track.id) dispatch(togglePlay());
    else dispatch(playFromQueue({ queue: tracks, index: idx }));
  };

  const changeSongStatus = async (song, next) => {
    setBusyId(song.id);
    try { await setSongStatus(song.id, next); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

  const owner = Boolean(album?.isOwner);
  const songToggle = (s, visible) => {
    const busy = busyId === s.id;
    const map = {
      draft:     { title: 'Publish',   icon: <PublishRoundedIcon fontSize="small" />,    next: 'published', role: 'success' },
      published: { title: 'Archive',   icon: <Inventory2RoundedIcon fontSize="small" />,  next: 'archived',  role: 'warning' },
      archived:  { title: 'Republish', icon: <UnarchiveRoundedIcon fontSize="small" />,   next: 'published', role: 'success' },
    };
    const cfg = map[s.status] || map.draft;
    return (
      <Tooltip title={cfg.title}>
        <IconButton
          size="small"
          aria-label={cfg.title}
          disabled={busy}
          onClick={(e) => { e.stopPropagation(); changeSongStatus(s, cfg.next); }}
          sx={(t) => ({
            width: 30, height: 30,
            color: `${cfg.role}.main`,
            bgcolor: alpha(t.palette[cfg.role].main, 0.14),
            border: `1px solid ${alpha(t.palette[cfg.role].main, 0.35)}`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            boxShadow: `inset 0 1px 0 ${alpha('#fff', 0.15)}`,
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

  if (loading) {
    return (
      <Box sx={{ pb: 12 }}>
        <Skeleton variant="rounded" width={200} height={200} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton width="40%" height={40} />
        <Skeleton width="25%" />
      </Box>
    );
  }

  if (err) {
    return (
      <Box sx={{ pb: 12 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mb: 2 }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Alert severity="error">{err}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 12 }}>
      <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mb: 2 }}>
        <ArrowBackRoundedIcon />
      </IconButton>

      <Box
        sx={{
          position: 'relative', borderRadius: 4, p: { xs: 2, sm: 3 }, mb: 3,
          background: (t) => accentColor
            ? `linear-gradient(135deg, ${accentColor}33, ${t.palette.background.paper} 75%)`
            : `linear-gradient(135deg, ${t.palette.primary.main}22, ${t.palette.background.paper} 70%)`,
          transition: 'background 0.4s ease',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { sm: 'flex-end' } }}>
          <Avatar
            variant="rounded"
            src={album.coverUrl || undefined}
            sx={{ width: 200, height: 200, borderRadius: 3, bgcolor: 'primary.main', boxShadow: 6 }}
          >
            <AlbumRoundedIcon sx={{ fontSize: 72 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="text.secondary">
              {album.isSingle ? 'Single' : 'Album'}
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, lineHeight: 1.1 }}>{album.title}</Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5, alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              {album.artist && (
                album.artist.username ? (
                  <Link component="button" variant="body1" underline="hover"
                    onClick={() => navigate(`/artist/${album.artist.username}`)}
                    sx={{ fontWeight: 600 }}>
                    {album.artist.stageName}
                  </Link>
                ) : (
                  <Typography variant="body1" color="text.secondary">{album.artist.stageName}</Typography>
                )
              )}
              <Chip size="small" label={album.status} color={statusColor(album.status)} variant="outlined" />
              <Typography variant="body2" color="text.secondary">
                {album.songs?.length ?? 0} {album.songs?.length === 1 ? 'track' : 'tracks'}
              </Typography>
              {fmtDate(album.releaseDate) && (
                <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                  <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />
                  <Typography variant="body2">{fmtDate(album.releaseDate)}</Typography>
                </Stack>
              )}
              {album.status === 'published' && (
                <ShareButton
                  kind="album"
                  albumPublicId={album.publicId}
                  albumId={album.id}
                  title={album.title}
                  artistName={album.artist?.stageName}
                />
              )}
            </Stack>

            {album.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 560, whiteSpace: 'pre-line' }}>
                {album.description}
              </Typography>
            )}
            {owner && (
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditRoundedIcon />}
                  onClick={() => setEditAlbumOpen(true)}
                >
                  Edit album
                </Button>
                {!(album.isSingle && (album.songs?.length ?? 0) >= 1) && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddRoundedIcon />}
                    onClick={() => setAddSongOpen(true)}
                  >
                    Add song
                  </Button>
                )}
              </Stack>
            )}
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ mb: 1 }} />

      {(!album.songs || album.songs.length === 0) ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
          No tracks in this album yet.{owner ? ' Use “Add song” to upload one.' : ''}
        </Typography>
      ) : (
        <List>
          {album.songs.map((s, idx) => {
            const isThis = playingId === s.id;
            return (
              <ListItemButton key={s.id} onClick={() => onPlay(idx)} sx={{ borderRadius: 2 }}
                onMouseEnter={() => setHoverId(s.id)}
                onMouseLeave={() => setHoverId(null)}>
                <ListItemAvatar>
                  <Box sx={{ position: 'relative', width: 40, height: 40 }}>
                    <Avatar
                      variant="rounded"
                      src={album.coverUrl || undefined}
                      sx={{ width: 40, height: 40, bgcolor: 'action.selected' }}
                    />
                  
                    {(isThis || hoverId === s.id) && (
                      <Box
                        sx={{
                          position: 'absolute', inset: 0, borderRadius: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          bgcolor: 'rgba(0,0,0,0.45)', color: 'common.white',
                        }}
                      >
                        {isThis ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
                      </Box>
                    )}
                  </Box>
                </ListItemAvatar>
                <ListItemText
                  primary={s.title}
                  secondary={`${s.trackNumber != null ? `Track ${s.trackNumber} · ` : ''}${fmtDuration(s.durationSeconds)}${
                    s.status === 'published'
                      ? ` · ${fmtStreams(s.playCount)} ${s.playCount === 1 ? 'stream' : 'streams'}`
                      : ''
                  }`}
                  slotProps={{ primary: { fontWeight: 600 } }}
                />

                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  {s.status === 'published' && (
                    <TrackLikeButton songId={s.id} title={s.title} visible={hoverId === s.id} />
                  )}
                  <Tooltip title="Add to playlist">
                    <IconButton size="small" aria-label="Add to playlist"
                      onClick={(e) => { e.stopPropagation(); setPlaylistSong(s); }}
                      sx={{
                        opacity: hoverId === s.id ? 1 : 0,
                        pointerEvents: hoverId === s.id ? 'auto' : 'none',
                        transition: 'opacity .18s ease',
                      }}>
                      <PlaylistAddRoundedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {s.status === 'published' && (
                    <Tooltip title="Comments">
                      <IconButton size="small" aria-label="Comments"
                        onClick={(e) => { e.stopPropagation(); setCommentSong(s); }}
                        sx={{
                          opacity: hoverId === s.id ? 1 : 0,
                          pointerEvents: hoverId === s.id ? 'auto' : 'none',
                          transition: 'opacity .18s ease',
                        }}>
                        <ChatBubbleOutlineRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {s.status === 'published' && (
                    <SongLyricsButton song={s} visible={hoverId === s.id} />
                  )}
                  {s.status === 'published' && (
                    <ShareButton
                      kind="song"
                      songPublicId={s.publicId}
                      albumPublicId={album.publicId}
                      albumId={album.id}
                      title={s.title}
                      artistName={album.artist?.stageName}
                      sx={{
                        opacity: hoverId === s.id ? 1 : 0,
                        pointerEvents: hoverId === s.id ? 'auto' : 'none',
                        transition: 'opacity .18s ease',
                      }}
                    />
                  )}

                  {owner && (
                    <>
                      <Chip size="small" label={s.status} color={statusColor(s.status)}
                        variant="outlined" sx={{ textTransform: 'capitalize' }} />
                      <Tooltip title="Rename">
                        <IconButton size="small" aria-label="Rename"
                          onClick={(e) => { e.stopPropagation(); setEditSong(s); }}
                          sx={{
                            opacity: hoverId === s.id ? 1 : 0,
                            pointerEvents: hoverId === s.id ? 'auto' : 'none',
                            transition: 'opacity .18s ease',
                          }}>
                          <DriveFileRenameOutlineRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {songToggle(s, hoverId === s.id)}
                    </>
                  )}
                </Stack>
              </ListItemButton>
            );
          })}
        </List>
      )}

      {editAlbumOpen && (
        <EditAlbumDialog
          album={album}
          onClose={() => setEditAlbumOpen(false)}
          onSaved={async () => { setEditAlbumOpen(false); await load(); }}
          onError={setErr}
        />
      )}
      {addSongOpen && (
        <AddSongDialog
          albumId={album.id}
          nextTrack={(album.songs?.length ?? 0) + 1}
          onClose={() => setAddSongOpen(false)}
          onAdded={async () => { setAddSongOpen(false); await load(); }}
          onError={setErr}
        />
      )}
      {editSong && (
        <RenameSongDialog
          song={editSong}
          onClose={() => setEditSong(null)}
          onSaved={async () => { setEditSong(null); await load(); }}
          onError={setErr}
        />
      )}
      <AddToPlaylistDialog
        open={Boolean(playlistSong)}
        onClose={() => setPlaylistSong(null)}
        songId={playlistSong?.id}
        songTitle={playlistSong?.title}
      />
      <Dialog
        open={Boolean(commentSong)}
        onClose={closeComments}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ pb: 1 }}>{commentSong?.title}</DialogTitle>
        <DialogContent dividers>
          {commentSong && (
            <CommentSection
              songId={commentSong.id}
              isSongOwner={owner}
              highlightCommentId={highlightCommentId}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeComments}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function EditAlbumDialog({ album, onClose, onSaved, onError }) {
  const [title, setTitle] = useState(album.title);
  const [coverUrl, setCoverUrl] = useState(album.coverUrl || '');
  const [description, setDescription] = useState(album.description || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateAlbum(album.id, {
        title: title.trim(),
        coverUrl: coverUrl.trim() || null,
        description: description.trim() || null,
      });
      await onSaved();
    } catch (e) { onError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit album</DialogTitle>
      {saving && <LinearProgress />}
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth autoFocus />
          <TextField label="Description" value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth multiline minRows={3} placeholder="Tell listeners about this release…" />
          <ImagePicker
            label="Cover image"
            shape="square"
            value={coverUrl}
            onChange={setCoverUrl}
            uploadFn={uploadAlbumCoverImage}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !title.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

function AddSongDialog({ albumId, nextTrack, onClose, onAdded, onError }) {
  const [title, setTitle] = useState('');
  const [trackNumber, setTrackNumber] = useState(String(nextTrack));
  const [genres, setGenres] = useState([]);
  const [genreId, setGenreId] = useState('');
  const [file, setFile] = useState(null);
  const [durationSeconds, setDurationSeconds] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchGenres().then(setGenres).catch(() => setGenres([])); }, []);

  // Auto-read duration from the chosen file (no field shown to the user).
  const onFile = (f) => {
    setFile(f);
    setDurationSeconds(null);
    if (!f) return;
    try {
      const url = URL.createObjectURL(f);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        setDurationSeconds(Number.isFinite(audio.duration) ? Math.round(audio.duration) : null);
      };
      audio.onerror = () => { URL.revokeObjectURL(url); setDurationSeconds(null); };
      audio.src = url;
    } catch { setDurationSeconds(null); }
  };

  const save = async () => {
    if (!file) { onError('Choose an audio file first.'); return; }
    setSaving(true);
    try {
      await uploadSong({
        title: title.trim(),
        albumId,
        trackNumber: trackNumber ? Number(trackNumber) : null,
        durationSeconds,
        genreIds: genreId ? [genreId] : [],
        file,
      });
      await onAdded();
    } catch (e) { onError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Add song to album</DialogTitle>
      {saving && <LinearProgress />}
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Song title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth autoFocus />
          <TextField label="Track number" type="number" value={trackNumber}
            onChange={(e) => setTrackNumber(e.target.value)} fullWidth />
          <TextField select label="Genre" value={genreId} onChange={(e) => setGenreId(e.target.value)} fullWidth>
            <MenuItem value="">None</MenuItem>
            {genres.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
          </TextField>
          <Button variant="outlined" component="label">
            {file ? file.name : 'Choose audio file'}
            <input hidden type="file" accept="audio/*" onChange={(e) => onFile(e.target.files?.[0] || null)} />
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !title.trim() || !file}>Upload</Button>
      </DialogActions>
    </Dialog>
  );
}

function RenameSongDialog({ song, onClose, onSaved, onError }) {
  const [title, setTitle] = useState(song.title);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateSong(song.id, { title: title.trim() });
      await onSaved();
    } catch (e) { onError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Rename track</DialogTitle>
      {saving && <LinearProgress />}
      <DialogContent sx={{ pt: 2 }}>
        <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)}
          fullWidth autoFocus sx={{ mt: 1 }} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !title.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}