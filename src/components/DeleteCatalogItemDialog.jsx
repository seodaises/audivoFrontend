import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Button, Alert, TextField, Box,
} from '@mui/material';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';

// Confirmation for a HARD delete of a song or album.
//
// TWO CONFIRMATION MODES, because there are two different people who can land here
// and they are proving two different things:
//
//   ARTIST (requirePassword) — proves WHO you are. The threat is a live session in
//   the wrong hands: an unlocked laptop, a borrowed machine. The session already
//   says "someone is logged in as you"; the password says "and it's actually you."
//   This is verified SERVER-SIDE inside the delete endpoint — the dialog is just
//   the collection point. A frontend-only check would be theatre, since anyone can
//   call the API directly and never see this component at all.
//
//   ADMIN (cascading album) — proves WHAT you're deleting. An admin can't type an
//   artist's password and shouldn't have to; their authority is already established
//   by their role. What they can get wrong is the TARGET — nuking the wrong band's
//   discography. So they type the title, which cannot be produced by a mis-click.
//
// The blast-radius warning is shown to BOTH, because "delete this album" and
// "delete this album AND its 12 tracks" are different decisions and everyone is
// entitled to know which one they're about to make.
export default function DeleteCatalogItemDialog({
  open,
  kind,             // 'song' | 'album'
  target,           // { id, title, ... }
  songsAtRisk,      // songs that die with an album (0 for a song delete)
  requirePassword,  // true on the artist's own catalog
  onClose,
  onConfirm,        // (password) => Promise
}) {
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState(null);

  if (!target) return null;

  const title = target.title || 'Untitled';
  const cascades = kind === 'album' && songsAtRisk > 0;

  // Admins typing the title: case-insensitive + trimmed. The point is proving you
  // READ the name, not proving you can reproduce whitespace.
  const typedOk = !cascades || typed.trim().toLowerCase() === title.toLowerCase();
  const passwordOk = password.length > 0;
  const confirmed = requirePassword ? passwordOk : typedOk;

  const handleClose = () => {
    if (busy) return;
    setPassword(''); setTyped(''); setErr(null);
    onClose();
  };

  const handleConfirm = async () => {
    setBusy(true); setErr(null);
    try {
      await onConfirm(password);
      setPassword(''); setTyped('');
      onClose();
    } catch (e) {
      // Keep the dialog OPEN on failure — this is the whole point when a password is
      // involved. A wrong password is the EXPECTED failure here, and the user needs
      // to see "Password is incorrect" attached to the field they got wrong, with
      // the delete they intended still queued up behind it. Closing would dump them
      // back on a list that still shows the item, with no idea what happened.
      setErr(e.message);
      setPassword(''); // wrong password? clear it. Don't make them backspace.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <DeleteForeverRoundedIcon color="error" fontSize="small" />
        Delete {kind}?
      </DialogTitle>

      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{title}</Box>
          {' '}will be permanently deleted, along with its audio file. This cannot be undone.
        </DialogContentText>

        {/* The cascade warning. This is the number that changes the decision. */}
        {cascades && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This will also delete{' '}
            <Box component="span" sx={{ fontWeight: 700 }}>
              {songsAtRisk} {songsAtRisk === 1 ? 'track' : 'tracks'}
            </Box>{' '}
            in this album, and their audio files.
          </Alert>
        )}

        {/* An exit ramp. If someone opened this dialog just to take a release off
            Browse, ARCHIVE is what they actually wanted — better to say so here than
            let them discover it after the file is gone. */}
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          Only trying to take this off Browse? Archive it instead — that's reversible.
        </Alert>

        {requirePassword ? (
          <TextField
            fullWidth
            size="small"
            autoFocus
            type="password"
            label="Confirm your password"
            /* Tells the password manager this is a re-auth, not a login or a new
               password — so it offers the saved credential instead of trying to
               save "hunter2" as a brand new one. */
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            /* Enter submits. Someone who has typed their password and is staring at
               a red button should not have to reach for the mouse. */
            onKeyDown={(e) => {
              if (e.key === 'Enter' && passwordOk && !busy) handleConfirm();
            }}
            helperText="Deleting your own work requires your password."
          />
        ) : cascades ? (
          <TextField
            fullWidth
            size="small"
            autoFocus
            label={`Type "${title}" to confirm`}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={busy}
          />
        ) : null}

        {err && <Alert severity="error" sx={{ mt: 2 }}>{err}</Alert>}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={busy}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={busy || !confirmed}
        >
          {busy ? 'Deleting…' : `Delete ${kind}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}