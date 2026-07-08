import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Button, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Avatar, Alert, Skeleton, TablePagination,
  Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, Snackbar, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton,
  InputAdornment,
} from '@mui/material';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import SetUserStatusDialog from '../components/SetUserStatusDialog';
import DeleteUserDialog from '../components/DeleteUserDialog';

const ROLE_LEVEL = {
  'Super Admin': 5, 'Admin': 4, 'Moderator': 3, 'Artist': 2, 'Listener': 1,
};

export default function ManageAdminsPage() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);      // MUI TablePagination is 0-indexed
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [toast, setToast] = useState('');

  // Search: `search` is the raw input; `debouncedSearch` is what we send.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);

  // Status-menu + confirm-dialog state (mirrors Manage Users).
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmNext, setConfirmNext] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);

  // Debounce: 350ms after the last keystroke, promote `search` -> `debouncedSearch`.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // A new search term always sends us back to the first page of results.
  useEffect(() => { setPage(0); }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({ page: page + 1, limit });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const { data } = await api(`/admin/admins?${params.toString()}`);
      setRows(data.users);
      setTotal(data.pagination.total);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const myLevel = ROLE_LEVEL[me?.role] ?? 0;

  const openStatusMenu = (e, row) => { setMenuAnchor(e.currentTarget); setMenuRow(row); };
  const closeStatusMenu = () => { setMenuAnchor(null); setMenuRow(null); };

  const requestToggle = () => {
    if (!menuRow) return;
    setConfirmRow(menuRow);
    setConfirmNext(!menuRow.isActive);
    closeStatusMenu();
  };

  const doToggle = async () => {
    await api(`/admin/users/${confirmRow.id}/status`, {
      method: 'PATCH',
      body: { isActive: confirmNext },
    });
    await load();
  };

  const closeConfirm = () => { setConfirmRow(null); setConfirmNext(null); };

  // Menu item clicked -> stage the delete dialog, then close the menu.
  const requestDelete = () => {
    if (!menuRow) return;
    setDeleteRow(menuRow);
    closeStatusMenu();
  };

  // Soft-delete write. PATCH .../delete (state change, not a hard DELETE).
  // On success the row vanishes because the backend filters deleted_at IS NULL.
  const doDelete = async () => {
    await api(`/admin/users/${deleteRow.id}/delete`, { method: 'PATCH' });
    await load();
  };

  const closeDelete = () => setDeleteRow(null);

  const COLS = 6;

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          width: '100%',
          mb: 2,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Manage admins</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Create and manage Admin accounts.
          </Typography>
        </Box>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
        >
          <TextField
            size="small"
            placeholder="Search name, username, or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 300 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="clear search" onClick={() => setSearch('')}>
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
          <Button
            variant="contained" disableElevation startIcon={<PersonAddRoundedIcon />}
            onClick={() => setAddOpen(true)}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Add admin
          </Button>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Admin</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={160} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                    <TableCell><Skeleton width={160} /></TableCell>
                    <TableCell><Skeleton width={110} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell align="right"><Skeleton width={32} /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS} sx={{ borderBottom: 'none' }}>
                    <Stack sx={{ alignItems: 'center', py: 6 }} spacing={1.5}>
                      {debouncedSearch ? (
                        <>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            No matches
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            No admins match “{debouncedSearch}”.
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            No admins yet
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Create an admin account to get started.
                          </Typography>
                          <Button
                            variant="contained" disableElevation startIcon={<PersonAddRoundedIcon />}
                            onClick={() => setAddOpen(true)} sx={{ mt: 1 }}
                          >
                            Add admin
                          </Button>
                        </>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const isSelf = u.id === me?.id;
                  const outranked = myLevel > (ROLE_LEVEL[u.role] ?? 0);
                  const canActOnStatus = outranked && !isSelf;

                  const statusTip = isSelf
                    ? 'You cannot act on your own account here'
                    : !outranked
                      ? 'You cannot modify a user at or above your level'
                      : 'Account actions';

                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                            {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {u.displayName || '—'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">@{u.username}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{u.email || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">{u.phoneNumber || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.isActive ? 'Active' : 'Inactive'}
                          color={u.isActive ? 'success' : 'default'}
                          size="small"
                          variant={u.isActive ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title={statusTip}>
                          {/* span so the tooltip shows even when the button is disabled */}
                          <span>
                            <IconButton
                              size="small"
                              onClick={(e) => openStatusMenu(e, u)}
                              disabled={!canActOnStatus}
                              aria-label="account actions"
                            >
                              <MoreVertRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={limit}
          onRowsPerPageChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeStatusMenu}>
        {menuRow?.isActive ? (
          <MenuItem onClick={requestToggle}>
            <ListItemIcon><BlockRoundedIcon fontSize="small" color="error" /></ListItemIcon>
            <ListItemText>Deactivate account</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={requestToggle}>
            <ListItemIcon><CheckCircleRoundedIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Reactivate account</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={requestDelete}>
          <ListItemIcon><DeleteForeverRoundedIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete account</ListItemText>
        </MenuItem>
      </Menu>

      <SetUserStatusDialog
        open={Boolean(confirmRow)}
        target={confirmRow}
        nextActive={confirmNext}
        onClose={closeConfirm}
        onConfirm={doToggle}
      />

      <DeleteUserDialog
        open={Boolean(deleteRow)}
        target={deleteRow}
        onClose={closeDelete}
        onConfirm={doDelete}
      />

      <AddAdminDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(msg) => { setToast(msg); load(); }}
      />

      <Snackbar
        open={!!toast} autoHideDuration={4000} onClose={() => setToast('')}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

function AddAdminDialog({ open, onClose, onCreated }) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null); // set once the account is created
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setEmail(''); setDisplayName(''); setUsername('');
    setErr(null); setResult(null); setCopied(false);
  };
  const handleClose = () => { reset(); onClose(); };

  const cleanUsername = username.trim().toLowerCase();
  const usernameValid = /^[a-z0-9_]{3,20}$/.test(cleanUsername);
  const emailValid = /^\S+@\S+\.\S+$/.test(email.trim());
  const formValid = emailValid && displayName.trim() && usernameValid;

  const create = async () => {
    if (!formValid) return;
    setSubmitting(true); setErr(null);
    try {
      const { data } = await api('/admin/users', {
        method: 'POST',
        body: {
          email: email.trim(),
          displayName: displayName.trim(),
          username: cleanUsername,
        },
      });
      setResult({
        email: data.user.email,
        tempPassword: data.tempPassword,      // shown once, here
        emailDelivery: data.emailDelivery,    // { sent } or { sent:false, loginUrl }
      });
      onCreated(`Admin account created for @${data.user.username}`);
    } catch (e) {
      setErr(e.message); // e.g. "Email already registered" / "Username already taken"
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(result.tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard blocked - the field is selectable as a fallback */ }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      {!result ? (
        <>
          <DialogTitle sx={{ fontWeight: 700 }}>Create an admin</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              A new account is created with a temporary password. The admin sets
              their own password the first time they log in.
            </Typography>

            {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                size="small" label="Email" type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!email && !emailValid}
                helperText={!!email && !emailValid ? 'Enter a valid email' : ' '}
              />
              <TextField
                size="small" label="Display name" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <TextField
                size="small" label="Username" value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={!!username && !usernameValid}
                helperText={
                  !!username && !usernameValid
                    ? '3-20 chars: lowercase letters, numbers, underscores'
                    : ' '
                }
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start">@</InputAdornment>,
                  },
                }}
              />
              <Box>
                <Chip label="Role: Admin" size="small" color="primary" variant="outlined" />
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose} color="inherit">Cancel</Button>
            <Button
              variant="contained" disableElevation onClick={create}
              disabled={!formValid || submitting}
            >
              {submitting ? 'Creating...' : 'Create account'}
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircleRoundedIcon color="primary" /> Account created
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Share these with the new admin. This password is shown only once.
            </Typography>

            <Stack spacing={2}>
              <TextField
                size="small" label="Email" value={result.email}
                slotProps={{ input: { readOnly: true } }}
              />
              <TextField
                size="small" label="Temporary password" value={result.tempPassword}
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton edge="end" onClick={copyPassword} size="small">
                          <ContentCopyRoundedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
                helperText={copied ? 'Copied!' : ' '}
              />
              <Alert severity={result.emailDelivery?.sent ? 'success' : 'info'}>
                {result.emailDelivery?.sent
                  ? 'Credentials were emailed to the new admin.'
                  : `Email isn't set up in dev - share these manually. Login: ${result.emailDelivery?.loginUrl || '/login'}`}
              </Alert>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button variant="contained" disableElevation onClick={handleClose}>Done</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}