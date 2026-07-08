import { useState } from 'react';
import {Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button,} from '@mui/material';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

export default function SetUserStatusDialog({ open, target, nextActive, onClose, onConfirm }) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();     // parent does the PATCH + refetch
      onClose();
    } finally {
      setBusy(false);        // dialog stays mounted, so reset either way
    }
  };

  const handle = target ? `@${target.username}` : 'this account';
  const deactivating = nextActive === false;

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {deactivating
          ? <BlockRoundedIcon color="error" fontSize="small" />
          : <CheckCircleRoundedIcon color="success" fontSize="small" />}
        {deactivating ? 'Deactivate account?' : 'Reactivate account?'}
      </DialogTitle>
      <DialogContent>
        <DialogContentText>
          {deactivating
            ? `${handle} won't be able to log in until the account is reactivated. Existing sessions are rejected on their next request.`
            : `${handle} will be able to log in again.`}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          color={deactivating ? 'error' : 'success'}
          disableElevation
          onClick={handleConfirm}
          disabled={busy}
          startIcon={deactivating ? <BlockRoundedIcon /> : <CheckCircleRoundedIcon />}
        >
          {busy
            ? (deactivating ? 'Deactivating…' : 'Reactivating…')
            : (deactivating ? 'Deactivate' : 'Reactivate')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}