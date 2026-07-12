import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Alert, Skeleton, TablePagination,
  ToggleButton, ToggleButtonGroup, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Divider, TextField, InputAdornment,
} from '@mui/material';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import TaskAltRoundedIcon from '@mui/icons-material/TaskAltRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { api } from '../api/client';

// status -> chip colour. Mirrors the backend's { new | read | resolved }.
const statusColor = (s) => {
  switch (s) {
    case 'new': return 'warning';
    case 'read': return 'info';
    case 'resolved': return 'success';
    default: return 'default';
  }
};

// Compact, locale-aware timestamp for the table.
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
};

// Trim a long message down for the table cell; the full text lives in the dialog.
const preview = (text, n = 80) => {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

// Who closed this, if anyone. Prefers the display name, falls back to @username.
const handlerLabel = (h) => (h ? (h.displayName || `@${h.username}`) : null);

// Admin page: the contact-form inbox. Messages arrive as 'new'; opening one
// auto-marks it 'read' (the passive half of the workflow), and resolving is an
// explicit click that stamps WHO closed it. Gated at the route by
// requireMinLevel(ADMIN) + manage_users — same guard as the user console.
export default function ContactQueriesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);      // MUI TablePagination is 0-indexed
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // '' = all; otherwise 'new' | 'read' | 'resolved'.
  const [status, setStatus] = useState('');

  // `search` = what's typed (updates every keystroke, so the input stays snappy);
  // `debounced` = what we actually query with, 350ms after typing stops.
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // The message currently open in the read dialog (or null).
  const [selected, setSelected] = useState(null);

  // Guards the dialog buttons while a PATCH is in flight.
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // A new filter or search always sends us back to the first page — otherwise
  // you can be stranded on "page 4" of a result set that now has one page.
  useEffect(() => { setPage(0); }, [status, debounced]);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({ page: page + 1, limit });
      if (status) params.set('status', status);
      if (debounced) params.set('search', debounced);
      const { data } = await api(`/admin/contact-messages?${params.toString()}`);
      setRows(data.messages);
      setTotal(data.pagination.total);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, debounced]);

  useEffect(() => { load(); }, [load]);

  // One PATCH helper for every transition. The backend returns the updated row
  // in the same shape as the list, so we can patch it straight into local state
  // and keep the open dialog in sync without a full refetch.
  const patchStatus = useCallback(async (id, next) => {
    setSaving(true); setErr(null);
    try {
      const { data } = await api(`/admin/contact-messages/${id}/status`, {
        method: 'PATCH',
        body: { status: next },
      });
      setRows((prev) => prev.map((r) => (r.id === data.id ? data : r)));
      setSelected((cur) => (cur && cur.id === data.id ? data : cur));
      return data;
    } catch (e) {
      setErr(e.message);
      return null;
    } finally {
      setSaving(false);
    }
  }, []);

  // Opening a message auto-drains it from the "New" queue. Resolving stays an
  // explicit, deliberate click — see the note on handled_by in the service.
  const openMessage = useCallback(async (m) => {
    setSelected(m);
    if (m.status === 'new') await patchStatus(m.id, 'read');
  }, [patchStatus]);

  // A row that no longer matches the active filter shouldn't linger in the
  // table. Refetch on close so the list is honest.
  const closeDialog = useCallback(() => {
    setSelected(null);
    if (status) load();
  }, [status, load]);

  const COLS = 7;

  // Say WHY the table is empty — a no-hit search should not look like a bug.
  const emptyLabel = () => {
    if (debounced) return `No messages matching "${debounced}".`;
    if (status) return `No ${status} messages.`;
    return 'No contact messages yet.';
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{
          width: '100%',
          mb: 2,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
        }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <MailRoundedIcon color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Contact queries</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Messages submitted through the public contact form.
          </Typography>
        </Box>

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' } }}
        >
          <TextField
            size="small"
            placeholder="Search name, email, or subject…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 280 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <ToggleButtonGroup
            size="small"
            exclusive
            value={status}
            onChange={(_, v) => setStatus(v ?? '')}
            aria-label="filter by status"
          >
            <ToggleButton value="" aria-label="all">All</ToggleButton>
            <ToggleButton value="new" aria-label="new">New</ToggleButton>
            <ToggleButton value="read" aria-label="read">Read</ToggleButton>
            <ToggleButton value="resolved" aria-label="resolved">Resolved</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>From</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Message</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Resolved by</TableCell>
                <TableCell align="right">Received</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell><Skeleton width={160} /></TableCell>
                    <TableCell><Skeleton width={120} /></TableCell>
                    <TableCell><Skeleton width={200} /></TableCell>
                    <TableCell><Skeleton width={70} /></TableCell>
                    <TableCell><Skeleton width={90} /></TableCell>
                    <TableCell align="right"><Skeleton width={110} /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      {emptyLabel()}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((m) => (
                  <TableRow
                    key={m.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => openMessage(m)}
                  >
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{m.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{m.subject || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{preview(m.message)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={m.status}
                        color={statusColor(m.status)}
                        size="small"
                        variant={m.status === 'new' ? 'filled' : 'outlined'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {handlerLabel(m.handledBy) || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">{fmtDate(m.createdAt)}</Typography>
                    </TableCell>
                  </TableRow>
                ))
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

      <ContactMessageDialog
        message={selected}
        onClose={closeDialog}
        onSetStatus={patchStatus}
        saving={saving}
      />
    </Box>
  );
}

// The read view. Shows the full message, the audit line once it's been resolved,
// and one primary action keyed off the current status (resolve, or reopen).
function ContactMessageDialog({ message, onClose, onSetStatus, saving }) {
  const open = Boolean(message);
  const isResolved = message?.status === 'resolved';

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      {message && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
            <MailRoundedIcon color="primary" fontSize="small" />
            {message.subject || '(no subject)'}
            <IconButton
              onClick={onClose}
              size="small"
              disabled={saving}
              sx={{ position: 'absolute', right: 8, top: 8 }}
              aria-label="close"
            >
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers>
            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="subtitle2">{message.name}</Typography>
                <Chip
                  label={message.status}
                  color={statusColor(message.status)}
                  size="small"
                  variant={message.status === 'new' ? 'filled' : 'outlined'}
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>

              <Typography variant="body2" color="text.secondary">{message.email}</Typography>
              <Typography variant="caption" color="text.secondary">
                Received {fmtDate(message.createdAt)}
              </Typography>

              {/* Audit line — only exists once someone has actually closed it. */}
              {isResolved && message.handledBy && (
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                  Resolved by {handlerLabel(message.handledBy)} · {fmtDate(message.handledAt)}
                </Typography>
              )}
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.message}
            </Typography>
          </DialogContent>

          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            <Button
              startIcon={<OpenInNewRoundedIcon />}
              href={`mailto:${message.email}?subject=${encodeURIComponent(
                `Re: ${message.subject || 'Your message to Audivo'}`
              )}`}
            >
              Reply by email
            </Button>

            <Box sx={{ flex: 1 }} />

            {isResolved ? (
              <Button
                startIcon={<ReplayRoundedIcon />}
                color="inherit"
                disabled={saving}
                onClick={() => onSetStatus(message.id, 'read')}
              >
                Reopen
              </Button>
            ) : (
              <Button
                variant="contained"
                disableElevation
                color="success"
                startIcon={<TaskAltRoundedIcon />}
                disabled={saving}
                onClick={() => onSetStatus(message.id, 'resolved')}
              >
                Mark resolved
              </Button>
            )}

            <Button onClick={onClose} color="inherit" disabled={saving}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}