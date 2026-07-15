import { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack,
  List, ListItemButton, ListItemText, ListItemIcon, Typography, Alert,
  Skeleton, TextField, Divider, CircularProgress,
} from '@mui/material';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { fetchMyPlaylists, createPlaylist, addTrack } from '../api/playlist';

// One dialog, every trigger. Both MediaCard and the AlbumPage rows open this —
// there is no second copy of "add to playlist" logic anywhere.
//
// songId is the SONG id (not a playlist_songs row id — that concept doesn't
// exist until the song is IN a playlist).
export default function AddToPlaylistDialog({ open, onClose, songId, songTitle }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [addedId, setAddedId] = useState(null);   // which one we just added to

  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    try {
      const data = await fetchMyPlaylists({ page: 1, limit: 100 });
      setPlaylists(data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on OPEN, not on mount. This dialog is rendered once per song card, so
  // fetching on mount would fire one request per card on the page — forty cards,
  // forty identical calls to /playlists, before anyone has clicked anything.
  useEffect(() => {
    if (!open) return;
    setAddedId(null);
    setCreating(false);
    setNewTitle('');
    load();
  }, [open, load]);

  const add = async (playlistId) => {
    setBusyId(playlistId);
    setErr('');
    try {
      // No afterPlaylistSongId → append to the end. That's the right default for
      // "add to playlist": you're putting it at the bottom of the list, not
      // inserting it into the middle of someone's carefully ordered set.
      await addTrack(playlistId, songId);
      setAddedId(playlistId);
      // Brief confirmation, then close. Long enough to register, short enough
      // not to feel like a step.
      setTimeout(onClose, 700);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
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
                {playlists.map((p) => (
                  <ListItemButton
                    key={p.id}
                    onClick={() => add(p.id)}
                    disabled={busyId != null}
                    sx={{ borderRadius: 2 }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {busyId === p.id ? (
                        <CircularProgress size={18} />
                      ) : addedId === p.id ? (
                        <CheckRoundedIcon color="success" fontSize="small" />
                      ) : (
                        <QueueMusicRoundedIcon fontSize="small" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={p.title}
                      secondary={`${p.trackCount ?? 0} ${p.trackCount === 1 ? 'track' : 'tracks'}`}
                      slotProps={{ primary: { fontWeight: 600 } }}
                    />
                  </ListItemButton>
                ))}
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