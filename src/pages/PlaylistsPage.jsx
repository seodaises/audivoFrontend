import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Button, Paper, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControlLabel, Switch, Tooltip, Chip,
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { fetchMyPlaylists, createPlaylist, deletePlaylist } from '../api/playlist';
import { PLAYLIST } from '../constants/route_constant';

// Deterministic cover gradient, same golden-angle trick MediaCard uses. 137.508°
// is the golden angle — stepping hue by it spreads consecutive ids across the
// colour wheel instead of clustering them, so two playlists made back-to-back
// don't come out nearly the same colour.
const gradientFor = (seed = 0) => {
  const h1 = Math.round(seed * 137.508) % 360;
  const h2 = (h1 + 50) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 45%), hsl(${h2} 60% 35%))`;
};

export default function PlaylistsPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErr('');
    try {
      const data = await fetchMyPlaylists({ page: 1, limit: 100 });
      setItems(data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setErr('');
    try {
      const created = await createPlaylist({
        title: title.trim(),
        description: description.trim() || undefined,
        isPublic,
      });
      setOpen(false);
      setTitle('');
      setDescription('');
      setIsPublic(false);
      // Straight into the new playlist — an empty list page would be a dead end.
      navigate(`${PLAYLIST}/${created.id}`);
    } catch (e) {
      setErr(e.message);
      setSaving(false);
    }
  };

  const remove = async (e, id) => {
    e.stopPropagation();  // the row is a click target; don't navigate on delete
    if (!window.confirm('Delete this playlist? The songs themselves are not deleted.')) return;
    try {
      await deletePlaylist(id);
      await load({ silent: true });
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Playlists</Typography>
          <Typography variant="body2" color="text.secondary">
            Your collections. Drag to reorder tracks inside one.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
          New playlist
        </Button>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {loading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={72} />)}
        </Stack>
      ) : items.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}
        >
          <QueueMusicRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>No playlists yet</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Make one, then add songs to it from Browse.
          </Typography>
          <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>
            New playlist
          </Button>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {items.map((p) => (
            <Paper
              key={p.id}
              variant="outlined"
              onClick={() => navigate(`${PLAYLIST}/${p.id}`)}
              sx={{
                p: 1.5, borderRadius: 3, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'background-color .15s ease',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: 2, flexShrink: 0,
                  background: gradientFor(p.id),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <QueueMusicRoundedIcon sx={{ color: 'rgba(255,255,255,.85)' }} />
              </Box>

              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                    {p.title}
                  </Typography>
                  <Chip
                    size="small"
                    icon={p.isPublic ? <PublicRoundedIcon /> : <LockRoundedIcon />}
                    label={p.isPublic ? 'Public' : 'Private'}
                    variant="outlined"
                  />
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {p.trackCount ?? 0} {p.trackCount === 1 ? 'track' : 'tracks'}
                  {p.description ? ` · ${p.description}` : ''}
                </Typography>
              </Box>

              <Tooltip title="Delete playlist">
                <IconButton onClick={(e) => remove(e, p.id)} sx={{ flexShrink: 0 }}>
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Tooltip>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>New playlist</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Title" value={title} autoFocus fullWidth
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              label="Description (optional)" value={description} fullWidth multiline rows={2}
              onChange={(e) => setDescription(e.target.value)}
            />
            <FormControlLabel
              control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />}
              // Public means READABLE by anyone, not editable. Only the owner can
              // ever write to a playlist — the backend enforces that separately.
              label="Public (anyone can view it)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving || !title.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}