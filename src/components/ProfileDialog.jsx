import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Avatar, Typography, TextField, Button, Chip,
  IconButton, Divider, Alert, Grid, Tooltip,
  Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import { useAuth } from '../store/hooks/useAuth';
import DeleteAccountDialog from './DeleteAccountDialog';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const formFromUser = (u) => ({
  displayName: u?.name ?? '',
  firstName: u?.firstName ?? '',
  lastName: u?.lastName ?? '',
  avatarUrl: u?.avatarUrl ?? '',
  gender: u?.gender ?? '',
  birthday: u?.birthday ?? '',           // 'YYYY-MM-DD' or '' (native date input)
  phoneNumber: u?.phoneNumber ?? '',
  addressStreet: u?.address?.street ?? '',
  addressCity: u?.address?.city ?? '',
  addressCountry: u?.address?.country ?? '',
  addressPostalCode: u?.address?.postalCode ?? '',
});

export default function ProfileDialog({ open, onClose }) {
  const { user, updateProfile, refreshUser, loading, error, deleteAccount, changeUsername } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(formFromUser(user));
  const [saved, setSaved] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Username editor — separate endpoint, so it carries its own local state.
  const [usernameDraft, setUsernameDraft] = useState(user?.username ?? '');
  const [usernameBusy, setUsernameBusy] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [usernameSaved, setUsernameSaved] = useState(false);

  useEffect(() => {
    if (open) {
      refreshUser();
      setEditing(false);
      setSaved(false);
      setUsernameError(null);
      setUsernameSaved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the form in sync whenever the user object changes.
  useEffect(() => {
    setForm(formFromUser(user));
    setUsernameDraft(user?.username ?? '');
  }, [user]);

  if (!user) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaved(false);
    const ok = await updateProfile(form);
    if (ok) { setEditing(false); setSaved(true); }
  };

  const handleCancel = () => {
    setForm(formFromUser(user));
    setUsernameDraft(user?.username ?? '');
    setUsernameError(null);
    setUsernameSaved(false);
    setEditing(false);
  };

  const usernameChanged =
    usernameDraft.trim().toLowerCase() !== String(user.username || '').toLowerCase();

  const handleUsernameSave = async () => {
    setUsernameBusy(true);
    setUsernameError(null);
    setUsernameSaved(false);
    const { ok, error: uErr } = await changeUsername(usernameDraft.trim());
    if (ok) setUsernameSaved(true);
    else setUsernameError(uErr);
    setUsernameBusy(false);
  };

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();
  const addressLine = [
    user.address?.street, user.address?.city,
    user.address?.postalCode, user.address?.country,
  ].filter(Boolean).join(', ');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        Your profile
        <Box sx={{ flexGrow: 1 }} />
        {!editing && (
          <Tooltip title="Edit profile">
            <IconButton onClick={() => setEditing(true)} size="small"><EditRoundedIcon /></IconButton>
          </Tooltip>
        )}
        <IconButton onClick={onClose} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Header block: avatar + name + role + verification badge */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 2 }}>
          <Avatar src={user.avatarUrl || undefined} sx={{ width: 64, height: 64, bgcolor: 'primary.main', fontSize: 28 }}>
            {user.avatarUrl ? null : initial}
          </Avatar>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {user.fullName || user.name}
            </Typography>
            {user.username && (
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                @{user.username}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 0.5 }}>
              <Chip label={user.role} color="primary" variant="outlined" size="small" />
              {user.isVerified ? (
                <Chip icon={<VerifiedRoundedIcon />} label="Verified" color="success" variant="outlined" size="small" />
              ) : (
                <Chip icon={<ErrorOutlineRoundedIcon />} label="Unverified" color="warning" variant="outlined" size="small" />
              )}
            </Stack>
          </Box>
        </Stack>

        {saved && <Alert severity="success" sx={{ mb: 2 }}>Profile updated.</Alert>}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Divider sx={{ mb: 2 }} />

        {editing ? (
          // -------- EDIT MODE --------
          <Stack spacing={2}>
            {/* Username — its own endpoint, its own Change button + feedback */}
            <Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <TextField
                  label="Username"
                  fullWidth
                  value={usernameDraft}
                  onChange={(e) => {
                    setUsernameDraft(e.target.value);
                    setUsernameError(null);
                    setUsernameSaved(false);
                  }}
                  disabled={usernameBusy}
                  slotProps={{ input: { startAdornment: <Box component="span" sx={{ color: 'text.secondary', mr: 0.5 }}>@</Box> } }}
                  helperText="3–20 chars: lowercase letters, numbers, underscores"
                />
                {/* Match the input's height (56px) and top-align so the button
                    lines up with the field, not the helper text below it. */}
                <Button
                  variant="outlined"
                  onClick={handleUsernameSave}
                  disabled={usernameBusy || !usernameChanged || !usernameDraft.trim()}
                  sx={{ height: 56, flexShrink: 0, whiteSpace: 'nowrap', px: 2.5 }}
                >
                  {usernameBusy ? 'Saving…' : 'Change'}
                </Button>
              </Stack>
              {usernameSaved && <Alert severity="success" sx={{ mt: 1 }}>Username updated.</Alert>}
              {usernameError && <Alert severity="error" sx={{ mt: 1 }}>{usernameError}</Alert>}
            </Box>

            <Divider />

            <TextField label="Display name" fullWidth value={form.displayName} onChange={set('displayName')} required />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="First name" fullWidth value={form.firstName} onChange={set('firstName')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Last name" fullWidth value={form.lastName} onChange={set('lastName')} />
              </Grid>
            </Grid>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel id="gender-label">Gender</InputLabel>
                  <Select
                    labelId="gender-label"
                    label="Gender"
                    value={form.gender}
                    onChange={set('gender')}
                  >
                    <MenuItem value=""><em>Prefer not to say</em></MenuItem>
                    {GENDER_OPTIONS.filter((o) => o !== 'Prefer not to say').map((opt) => (
                      <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label="Birthday"
                  type="date"
                  fullWidth
                  value={form.birthday}
                  onChange={set('birthday')}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>

            <TextField label="Phone number" fullWidth value={form.phoneNumber} onChange={set('phoneNumber')}
              placeholder="e.g. +92 300 1234567" />

            <TextField label="Avatar URL" fullWidth value={form.avatarUrl} onChange={set('avatarUrl')}
              placeholder="https://…" helperText="Paste an image URL" />
            <Typography variant="overline" color="text.secondary">Address</Typography>
            <TextField label="Street" fullWidth value={form.addressStreet} onChange={set('addressStreet')} />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="City" fullWidth value={form.addressCity} onChange={set('addressCity')} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField label="Postal code" fullWidth value={form.addressPostalCode} onChange={set('addressPostalCode')} />
              </Grid>
            </Grid>
            <TextField label="Country" fullWidth value={form.addressCountry} onChange={set('addressCountry')} />
          </Stack>
        ) : (
          // -------- VIEW MODE --------
          <Stack spacing={1.5}>
            <Field label="Username" value={user.username ? `@${user.username}` : ''} />
            <Field label="Email" value={user.email} />
            <Field label="First name" value={user.firstName} />
            <Field label="Last name" value={user.lastName} />
            <Field label="Gender" value={user.gender} />
            <Field label="Birthday" value={user.birthday} />
            <Field label="Phone" value={user.phoneNumber} />
            <Field label="Address" value={addressLine} />
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {editing ? (
          <>
            <Button onClick={handleCancel} disabled={loading}>Cancel</Button>
            <Button variant="contained" disableElevation onClick={handleSave} disabled={loading}>
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </>
        ) : (
          <>
            <Button
              color="error"
              startIcon={<DeleteForeverRoundedIcon />}
              onClick={() => setDeleteOpen(true)}
              sx={{ mr: 'auto' }}
            >
              Delete account
            </Button>
            <Button onClick={onClose}>Close</Button>
          </>
        )}
      </DialogActions>

      <DeleteAccountDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteAccount}
      />
    </Dialog>
  );
}

function Field({ label, value }) {
  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>{value || '—'}</Typography>
    </Box>
  );
}