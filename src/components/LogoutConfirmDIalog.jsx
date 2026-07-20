import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
} from '@mui/material';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../store/hooks/useAuth';
import { LOGIN } from '../constants/route_constant';

export default function LogoutConfirmDialog({ open, onClose }) {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    await logout(); // clears the in-memory user and tears down playback
    window.location.assign(LOGIN); // full reload ensures audio and UI state are reset
    // no need to reset busy — the page unloads on navigation
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LogoutRoundedIcon color="primary" fontSize="small" />
        Log out?
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          You'll need to sign in again to get back to your account.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy}>Stay signed in</Button>
        <Button variant="contained" color="primary" disableElevation
          onClick={handleConfirm} disabled={busy} startIcon={<LogoutRoundedIcon />}>
          {busy ? 'Logging out…' : 'Log out'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}