import { useState, useEffect, useCallback } from 'react';
import {Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Chip, Avatar, Alert, Skeleton, TablePagination, Tooltip, Menu, MenuItem, ListItemIcon, ListItemText, IconButton, Divider, TextField, InputAdornment,} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import MoreVertRoundedIcon from '@mui/icons-material/MoreVertRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import { api } from '../api/client';
import { useAuth } from '../store/hooks/useAuth';
import SetUserStatusDialog from '../components/SetUserStatusDialog';
import DeleteUserDialog from '../components/DeleteUserDialog';

// Role name -> level, so the UI can apply the same strict-higher (>) rule the
// backend enforces: you only get actionable controls for users below you.
const ROLE_LEVEL = {
  'Super Admin': 5, 'Admin': 4, 'Moderator': 3, 'Artist': 2, 'Listener': 1,
};

const roleChipColor = (role) => {
  switch (role) {
    case 'Super Admin': return 'error';
    case 'Admin': return 'primary';
    case 'Moderator': return 'warning';
    case 'Artist': return 'info';
    default: return 'default';
  }
};

export default function ManageUsersPage() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);      // MUI TablePagination is 0-indexed
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Search: `search` is what the user is typing; `debouncedSearch` is what we
  // actually send. We debounce so we don't fire a request on every keystroke.
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Status-menu state: which row's chip was clicked (anchor + the row itself).
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  // Confirm-dialog state: the row we're about to flip and the value to send.
  const [confirmRow, setConfirmRow] = useState(null);
  const [confirmNext, setConfirmNext] = useState(null);

  // Delete-confirm state: the row staged for soft-delete.
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
      // Backend is 1-indexed; MUI is 0-indexed — translate here.
      const params = new URLSearchParams({ page: page + 1, limit });
      if (debouncedSearch) params.set('search', debouncedSearch);
      const { data } = await api(`/admin/users?${params.toString()}`);
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

  const openStatusMenu = (e, row) => {
    setMenuAnchor(e.currentTarget);
    setMenuRow(row);
  };
  const closeStatusMenu = () => {
    setMenuAnchor(null);
    setMenuRow(null);
  };

  // Menu item clicked -> stage the confirm dialog with the opposite of the
  // current status, then close the menu.
  const requestToggle = () => {
    if (!menuRow) return;
    setConfirmRow(menuRow);
    setConfirmNext(!menuRow.isActive);
    closeStatusMenu();
  };

  // The actual write. Passed to the dialog; it owns the busy state and calls
  // onClose. On success we refetch so the row reflects the DB.
  const doToggle = async () => {
    await api(`/admin/users/${confirmRow.id}/status`, {
      method: 'PATCH',
      body: { isActive: confirmNext },
    });
    await load();
  };

  const closeConfirm = () => {
    setConfirmRow(null);
    setConfirmNext(null);
  };

  // Menu item clicked -> stage the delete dialog, then close the menu.
  const requestDelete = () => {
    if (!menuRow) return;
    setDeleteRow(menuRow);
    closeStatusMenu();
  };

  // The soft-delete write. PATCH .../delete (state change, not a hard DELETE).
  // On success the row vanishes because the backend filters deleted_at IS NULL.
  const doDelete = async () => {
    await api(`/admin/users/${deleteRow.id}/delete`, { method: 'PATCH' });
    await load();
  };

  const closeDelete = () => setDeleteRow(null);

  const COLS = 7;

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
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Manage users</Typography>
        <TextField
          size="small"
          placeholder="Search name, username, or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: '100%', sm: 320 } }}
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
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Role</TableCell>
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
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell align="right"><Skeleton width={32} /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {debouncedSearch
                        ? `No users match “${debouncedSearch}”.`
                        : 'No users to show yet.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((u) => {
                  const isSelf = u.id === me?.id;
                  const outranked = myLevel > (ROLE_LEVEL[u.role] ?? 0);
                  const canActOnStatus = outranked && !isSelf;

                  const roleTip = isSelf
                    ? 'You cannot change your own role'
                    : !outranked
                      ? 'You cannot modify a user at or above your level'
                      : 'Change this role from Manage Roles';

                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
                            {(u.displayName || u.username || '?').charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {u.displayName || '—'}
                            {isSelf && (
                              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                (you)
                              </Typography>
                            )}
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
                        <Tooltip title={roleTip}>
                          <Chip label={u.role} color={roleChipColor(u.role)} size="small"
                            variant={outranked && !isSelf ? 'filled' : 'outlined'} />
                        </Tooltip>
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
                        <Tooltip
                          title={
                            isSelf
                              ? 'You cannot act on your own account here'
                              : !outranked
                                ? 'You cannot modify a user at or above your level'
                                : 'Account actions'
                          }
                        >
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

      {/* The one action menu, positioned at whichever row's kebab was clicked. */}
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
    </Box>
  );
}