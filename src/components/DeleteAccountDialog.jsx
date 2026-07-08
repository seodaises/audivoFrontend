import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, Alert, TextField,
} from '@mui/material';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';

export default function DeleteAccountDialog({ open, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const armed = password.trim().length > 0;

  const handleConfirm = async () => {
    if (!armed) return;
    setBusy(true);
    setError(null);
    try {
      await onConfirm(password); // parent: DELETE /auth/me { password } then logout
      // On success the auth tree unmounts (user cleared) — nothing to reset.
    } catch (err) {
      // Wrong password / other failure — keep the dialog open and explain.
      setError(err.message || 'Could not delete your account');
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (busy) return;
    setPassword('');
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DeleteForeverRoundedIcon color="error" fontSize="small" />
        Delete your account?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          This removes your account for good. You won&apos;t be able to log back
          in, and this can&apos;t be undone.
        </DialogContentText>
        <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
          Enter your password to confirm.
        </Alert>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          fullWidth
          size="small"
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
          disabled={busy}
          autoComplete="current-password"
          autoFocus
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          disableElevation
          onClick={handleConfirm}
          disabled={busy || !armed}
          startIcon={<DeleteForeverRoundedIcon />}
        >
          {busy ? 'Deleting…' : 'Delete my account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}