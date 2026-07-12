import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Alert, Stack, Typography,
} from '@mui/material';
import { createGenre } from '../api/catalog';

// Create a genre. The backend owns the real rules — trim, non-empty, and a 409
// on duplicates — so this dialog does the bare minimum client-side and lets the
// server's message do the talking. One source of truth for validation.
export default function AddGenreDialog({ open, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  // Reset on every open, so a previous error or a stale name doesn't reappear.
  useEffect(() => {
    if (open) { setName(''); setErr(null); setSaving(false); }
  }, [open]);

  const clean = name.trim();
  const canSave = clean.length > 0 && !saving;

  const submit = async () => {
    if (!canSave) return;
    setSaving(true); setErr(null);
    try {
      const created = await createGenre(clean);
      onCreated?.(created);   // let the parent refresh / toast
      onClose();
    } catch (e) {
      setErr(e.message);      // e.g. "Genre already exists" (409)
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 800 }}>Add genre</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Genres are shared across the catalog — artists pick from this list when tagging a track.
          </Typography>

          {err && <Alert severity="error">{err}</Alert>}

          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Genre name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            disabled={saving}
            placeholder="e.g. Lo-fi"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button variant="contained" disableElevation onClick={submit} disabled={!canSave}>
          {saving ? 'Adding…' : 'Add genre'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}