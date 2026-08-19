import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Alert, Box, Paper, Stack, Typography,
} from '@mui/material';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import AudivoCalendar from './AudivoCalendar';
import AudivoTimeSelect from './AudivoTimeSelect';

const combineToInstant = (date, time) => {
  if (!date || !time) return null;
  const [h, m] = time.split(':').map(Number);
  const when = new Date(
    date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0,
  );
  return Number.isNaN(when.getTime()) ? null : when;
};

export default function RescheduleAlbumDialog({
  open,
  album,          // { id, title, releaseAt } or null
  onClose,
  onConfirm,      // (releaseAtIso) => Promise
}) {
  const [date, setDate] = useState(null);
  const [time, setTime] = useState('18:00');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!open || !album) return;
    const current = album.releaseAt ? new Date(album.releaseAt) : null;
    if (current && !Number.isNaN(current.getTime())) {
      setDate(new Date(current.getFullYear(), current.getMonth(), current.getDate()));
      setTime(`${String(current.getHours()).padStart(2, '0')}:${String(current.getMinutes()).padStart(2, '0')}`);
    } else {
      setDate(null);
      setTime('18:00');
    }
    setErr(null);
  }, [open, album]);

  if (!album) return null;

  const instant = combineToInstant(date, time);
  const validFuture = instant && instant.getTime() > Date.now() + 60000;

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handleConfirm = async () => {
    if (!validFuture) return;
    setBusy(true);
    setErr(null);
    try {
      await onConfirm(instant.toISOString());
      onClose();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const preview = instant
    ? instant.toLocaleString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: 'numeric', minute: '2-digit',
      })
    : null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <EventRepeatRoundedIcon color="primary" fontSize="small" />
        Reschedule "{album.title}"
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Pick a new date and time. This cancels the current release job and
          queues a new one — the album stays a private, editable draft until
          the new time arrives.
        </Typography>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
            sx={{ alignItems: { sm: 'flex-start' } }}>
            <Box sx={{ flex: '0 0 auto', width: { xs: '100%', sm: 280 } }}>
              <AudivoCalendar
                value={date}
                onChange={setDate}
                minDate={new Date()}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
              <Typography variant="caption" color="text.secondary"
                sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                Time
              </Typography>
              <AudivoTimeSelect value={time} onChange={setTime} />
            </Box>
          </Stack>
        </Paper>

        <Typography variant="body2" sx={{ mt: 2 }}>
          {preview
            ? `New release: ${preview}`
            : 'Pick a date and time to see the new release moment.'}
        </Typography>

        {instant && !validFuture && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            The new time must be at least a minute in the future.
          </Alert>
        )}

        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={busy || !validFuture}
        >
          {busy ? 'Rescheduling…' : 'Confirm new time'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}