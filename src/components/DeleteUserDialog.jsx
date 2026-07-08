import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, Alert,
} from '@mui/material';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';

export default function DeleteUserDialog({ open, target, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handle = target ? `@${target.username}` : 'this account';

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DeleteForeverRoundedIcon color="error" fontSize="small" />
        Delete account?
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          {handle} will be removed from Manage users and can no longer log in.
        </DialogContentText>
        <Alert severity="warning" variant="outlined">
          This isn&apos;t the same as deactivating. A deleted account disappears
          from the tables and stays gone — there&apos;s no undo here.
        </Alert>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          disableElevation
          onClick={handleConfirm}
          disabled={busy}
          startIcon={<DeleteForeverRoundedIcon />}
        >
          {busy ? 'Deleting…' : 'Delete account'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}