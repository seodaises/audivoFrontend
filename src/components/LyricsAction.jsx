import { useState, useEffect, useRef, useCallback } from 'react';
import {
  IconButton, Tooltip, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, Box, Typography, Chip, Button, TextField, Stack,
} from '@mui/material';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { generateLyrics, fetchOwnedLyrics, updateLyrics } from '../api/lyrics';

const POLL_MS = 5000;
const MAX_POLLS = 24; // ~2 minutes, then stop quietly — a stuck job is a
// backend/worker problem to investigate, not something a listener-facing
// row should retry forever in the background.

const fmtTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

export default function LyricsAction({ song }) {
  const [status, setStatus] = useState(null); // null = never requested
  const [syncedLyrics, setSyncedLyrics] = useState(null);
  const [source, setSource] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draftLines, setDraftLines] = useState([]);
  const [saving, setSaving] = useState(false);

  const cancelledRef = useRef(false);
  const pollCountRef = useRef(0);
  const timeoutRef = useRef(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetchOwnedLyrics(song.id);
      setStatus(res.status);
      setSyncedLyrics(res.syncedLyrics);
      setSource(res.source);
      setErrorMessage(res.errorMessage);
      return res.status;
    } catch {
      return null;
    }
  }, [song.id]);

  const poll = useCallback(async () => {
    const s = await checkStatus();
    if (cancelledRef.current) return;
    if ((s === 'pending' || s === 'processing') && pollCountRef.current < MAX_POLLS) {
      pollCountRef.current += 1;
      timeoutRef.current = setTimeout(poll, POLL_MS);
    }
  }, [checkStatus]);

  useEffect(() => {
    cancelledRef.current = false;
    pollCountRef.current = 0;
    poll();
    return () => {
      cancelledRef.current = true;
      clearTimeout(timeoutRef.current);
    };
  }, [poll]);

  const handleGenerate = async (e) => {
    e.stopPropagation();
    setBusy(true);
    try {
      await generateLyrics(song.id);
      pollCountRef.current = 0;
      await poll();
    } catch {
    } finally {
      setBusy(false);
    }
  };

  const handleRegenerate = (e) => {
    e.stopPropagation();
    if (!window.confirm('Regenerate lyrics for this track? The current lyrics will be replaced.')) return;
    handleGenerate(e);
  };
  const handleOpenEdit = (e) => {
    e.stopPropagation();
    setDraftLines((syncedLyrics || []).map((l) => ({ ...l })));
    setEditOpen(true);
  };

  const handleDraftTextChange = (index, text) => {
    setDraftLines((prev) => prev.map((l, i) => (i === index ? { ...l, text } : l)));
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await updateLyrics(song.id, draftLines);
      setSyncedLyrics(res.syncedLyrics);
      setSource(res.source);
      setEditOpen(false);
    } catch {
    } finally {
      setSaving(false);
    }
  };

  if (status === 'pending' || status === 'processing') {
    return (
      <Tooltip title="Generating lyrics…">
        <span>
          <IconButton size="small" disabled>
            <CircularProgress size={16} />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  if (status === 'completed') {
    return (
      <>
        <Tooltip title="View lyrics">
          <IconButton
            size="small"
            color="success"
            onClick={(e) => { e.stopPropagation(); setDialogOpen(true); }}
          >
            <DescriptionRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit lyrics">
          <IconButton size="small" onClick={handleOpenEdit}>
            <EditRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Regenerate lyrics">
          <span>
            <IconButton size="small" disabled={busy} onClick={handleRegenerate}>
              {busy ? <CircularProgress size={16} /> : <ReplayRoundedIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>

        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {song.title} — lyrics
            <IconButton size="small" onClick={() => setDialogOpen(false)} aria-label="Close">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Chip
              size="small"
              label={source === 'artist_edited' ? 'Edited by you' : 'AI generated'}
              color="primary"
              variant="outlined"
              sx={{ mb: 2 }}
            />
            {(syncedLyrics || []).map((line, i) => (
              <Typography key={i} variant="body2" sx={{ mb: 0.75 }}>
                <Box component="span" sx={{ color: 'text.disabled', fontSize: 12, mr: 1 }}>
                  {fmtTime(line.time)}
                </Box>
                {line.text}
              </Typography>
            ))}
          </DialogContent>
        </Dialog>

        <Dialog open={editOpen} onClose={() => !saving && setEditOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Edit lyrics — {song.title}
            <IconButton size="small" onClick={() => setEditOpen(false)} disabled={saving} aria-label="Close">
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Stack spacing={1.5}>
              {draftLines.map((line, i) => (
                <Stack key={i} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                  <Typography variant="caption" color="text.disabled" sx={{ width: 40, flexShrink: 0 }}>
                    {fmtTime(line.time)}
                  </Typography>
                  <TextField
                    size="small"
                    fullWidth
                    value={line.text}
                    onChange={(e) => handleDraftTextChange(i, e.target.value)}
                  />
                </Stack>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button variant="contained" onClick={handleSaveEdit} disabled={saving}>
              {saving ? <CircularProgress size={18} color="inherit" /> : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  if (status === 'failed') {
    return (
      <Tooltip title={errorMessage || 'Generation failed — retry'}>
        <span>
          <IconButton size="small" color="error" disabled={busy} onClick={handleGenerate}>
            {busy ? <CircularProgress size={16} color="inherit" /> : <ReplayRoundedIcon fontSize="small" />}
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Generate lyrics">
      <span>
        <IconButton size="small" disabled={busy} onClick={handleGenerate}>
          {busy ? <CircularProgress size={16} /> : <MicRoundedIcon fontSize="small" />}
        </IconButton>
      </span>
    </Tooltip>
  );
}