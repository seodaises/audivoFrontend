import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, TextField, Stack, Alert, IconButton,
} from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { api } from '../api/client';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function ContactDialog({ open, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const valid =
    form.name.trim() &&
    EMAIL_RE.test(form.email.trim()) &&
    form.message.trim();

  const handleSend = async () => {
    if (!valid) {
      setError('Please fill in your name, a valid email, and a message.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api('/contact', {
        method: 'POST',
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
      });
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || 'Could not send your message. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setForm(EMPTY);
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Contact us
        <IconButton onClick={handleClose} size="small" sx={{ ml: 'auto' }} disabled={busy}>
          <CloseRoundedIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {sent ? (
          <Alert severity="success">
            Thanks — your message has been received. We&apos;ll get back to you by email.
          </Alert>
        ) : (
          <>
            <DialogContentText sx={{ mb: 2 }}>
              Locked out after a long time away, or have a question? Send us a note
              and we&apos;ll help you out.
            </DialogContentText>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <Stack spacing={2}>
              <TextField label="Your name" fullWidth value={form.name}
                onChange={set('name')} disabled={busy} required />
              <TextField label="Email" type="email" fullWidth value={form.email}
                onChange={set('email')} disabled={busy} required
                helperText="We'll reply to this address" />
              <TextField label="Subject" fullWidth value={form.subject}
                onChange={set('subject')} disabled={busy}
                placeholder="e.g. Reactivate my account" />
              <TextField label="Message" fullWidth multiline minRows={4}
                value={form.message} onChange={set('message')} disabled={busy} required />
            </Stack>
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {sent ? (
          <Button variant="contained" disableElevation onClick={handleClose}>Done</Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={busy}>Cancel</Button>
            <Button variant="contained" disableElevation onClick={handleSend} disabled={busy || !valid}>
              {busy ? 'Sending…' : 'Send message'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}