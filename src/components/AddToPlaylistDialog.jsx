import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  List, ListItemButton, ListItemText, ListItemIcon, Typography, Alert,
  Skeleton, TextField, Divider, CircularProgress, alpha,
} from '@mui/material';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { fetchMyPlaylists, createPlaylist, addTrack } from '../api/playlist';
export default function AddToPlaylistDialog({ open, onClose, songId, songTitle }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [addedId, setAddedId] = useState(null); 

  const [confirmId, setConfirmId] = useState(null);

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await fetchMyPlaylists({ page: 1, limit: 100, songId });
      setPlaylists(data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [songId]);

  useEffect(() => {
    if (!open) return;
    setAddedId(null);
    setConfirmId(null);
    setCreating(false);
    setNewTitle('');
    load();
  }, [open, load]);

  const doAdd = async (playlistId) => {
    setBusyId(playlistId);
    setErr('');
    try {
      await addTrack(playlistId, songId);
      setAddedId(playlistId);
      setTimeout(onClose, 700);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const add = (playlist) => {
    if (playlist.containsSong && confirmId !== playlist.id) {
      setConfirmId(playlist.id);
      return;
    }
    setConfirmId(null);
    doAdd(playlist.id);
  };

  const createAndAdd = async () => {
    if (!newTitle.trim()) return;
    setBusyId('new');
    setErr('');
    try {
      const created = await createPlaylist({ title: newTitle.trim() });
      await addTrack(created.id, songId);
      setAddedId(created.id);
      setTimeout(onClose, 700);
    } catch (e) {
      setErr(e.message);
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
        Add to playlist
        {songTitle && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {songTitle}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

        {loading ? (
          <Stack spacing={1}>
            {[...Array(3)].map((_, i) => <Skeleton key={i} variant="rounded" height={44} />)}
          </Stack>
        ) : (
          <>
            {playlists.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                You don't have any playlists yet. Make one below.
              </Typography>
            ) : (
              <List dense disablePadding>
                {playlists.map((p) => {
                  const isConfirming = confirmId === p.id;
                  return (
                    <ListItemButton
                      key={p.id}
                      onClick={() => add(p)}
                      disabled={busyId != null}
                      sx={{
                        borderRadius: 2,
                        ...(isConfirming && {
                          bgcolor: (t) => alpha(t.palette.warning.main, 0.08),
                        }),
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {busyId === p.id ? (
                          <CircularProgress size={18} />
                        ) : addedId === p.id ? (
                          <CheckRoundedIcon color="success" fontSize="small" />
                        ) : isConfirming ? (
                          <ErrorOutlineRoundedIcon color="warning" fontSize="small" />
                        ) : (
                          <QueueMusicRoundedIcon fontSize="small" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={p.title}
                        secondary={
                          isConfirming
                            ? 'Already in this playlist — click again to add anyway'
                            : p.containsSong
                              ? `${p.trackCount ?? 0} ${p.trackCount === 1 ? 'track' : 'tracks'} · already added`
                              : `${p.trackCount ?? 0} ${p.trackCount === 1 ? 'track' : 'tracks'}`
                        }
                        slotProps={{
                          primary: { fontWeight: 600 },
                          secondary: isConfirming ? { color: 'warning.main' } : undefined,
                        }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            )}

            <Divider sx={{ my: 1.5 }} />

            {creating ? (
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small" fullWidth autoFocus
                  placeholder="Playlist name"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
                  disabled={busyId != null}
                />
                <Button
                  variant="contained"
                  onClick={createAndAdd}
                  disabled={busyId != null || !newTitle.trim()}
                >
                  {busyId === 'new' ? <CircularProgress size={18} /> : 'Add'}
                </Button>
              </Stack>
            ) : (
              <Button
                startIcon={<AddRoundedIcon />}
                onClick={() => setCreating(true)}
                disabled={busyId != null}
              >
                New playlist
              </Button>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busyId != null}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}