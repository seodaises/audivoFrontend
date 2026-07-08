import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, TextField, Button, Alert, IconButton, Box,
} from '@mui/material';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { api } from '../api/client';

export default function ChangePasswordDialog({ open, onClose, forced = false, onSuccess }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (open) {
      setOldPassword(''); setNewPassword(''); setConfirm('');
      setErr(null); setOk(false); setLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setErr(null); setOk(false);
    if (newPassword.length < 8) return setErr('New password must be at least 8 characters.');
    if (newPassword !== confirm) return setErr('New passwords do not match.');
    if (newPassword === oldPassword) return setErr('New password must differ from the current one.');
    setLoading(true);
    try {
      await api('/auth/change-password', { method: 'POST', body: { oldPassword, newPassword } });
      setOk(true);
      setOldPassword(''); setNewPassword(''); setConfirm('');
      // Forced (first-login) flow: ask the app to re-check the flag, which lifts
      // this gate. The normal flow just shows the success message and stays open.
      if (forced && onSuccess) await onSuccess();
    } catch (e) { setErr(e.message); } // e.g. "Current password is incorrect"
    finally { setLoading(false); }
  };

  return (
    // When forced, the dialog can't be dismissed (no backdrop close, no escape,
    // no close buttons) until the password is successfully changed.
    <Dialog
      open={open}
      onClose={loading || forced ? undefined : onClose}
      disableEscapeKeyDown={forced}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LockResetRoundedIcon color="primary" fontSize="small" />
        {forced ? 'Set a new password' : 'Change password'}
        <Box sx={{ flexGrow: 1 }} />
        {!forced && (
          <IconButton onClick={onClose} size="small" disabled={loading}>
            <CloseRoundedIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent dividers>
        {forced && !ok && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You're signed in with a temporary password. Please set a new one to continue.
          </Alert>
        )}
        {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>Password changed successfully.</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label={forced ? 'Temporary password' : 'Current password'} type="password" fullWidth
            value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} disabled={loading} />
          <TextField label="New password" type="password" fullWidth value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} disabled={loading}
            helperText="At least 8 characters." />
          <TextField label="Confirm new password" type="password" fullWidth value={confirm}
            onChange={(e) => setConfirm(e.target.value)} disabled={loading}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {!forced && <Button onClick={onClose} disabled={loading}>Close</Button>}
        <Button variant="contained" color="primary" disableElevation
          onClick={handleSubmit} disabled={loading}>
          {loading ? 'Saving...' : (forced ? 'Set password & continue' : 'Update password')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}