import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Alert, Skeleton, TablePagination, Tooltip,
  ToggleButton, ToggleButtonGroup, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Button, Divider,
} from '@mui/material';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
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

export default function ContactQueriesPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);      // MUI TablePagination is 0-indexed
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // '' = all; otherwise 'new' | 'read' | 'resolved'.
  const [status, setStatus] = useState('');

  // The message currently open in the read dialog (or null).
  const [selected, setSelected] = useState(null);

  // A new filter always sends us back to the first page.
  useEffect(() => { setPage(0); }, [status]);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const params = new URLSearchParams({ page: page + 1, limit });
      if (status) params.set('status', status);
      const { data } = await api(`/admin/contact-messages?${params.toString()}`);
      setRows(data.messages);
      setTotal(data.pagination.total);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status]);

  useEffect(() => { load(); }, [load]);

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
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <MailRoundedIcon color="primary" />
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Contact queries</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Messages submitted through the public contact form.
          </Typography>
        </Box>

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
                    <TableCell align="right"><Skeleton width={110} /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLS}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      {status
                        ? `No ${status} messages.`
                        : 'No contact messages yet.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((m) => (
                  <TableRow key={m.id} hover sx={{ cursor: 'pointer' }} onClick={() => setSelected(m)}>
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
                      <Chip label={m.status} color={statusColor(m.status)} size="small"
                        variant={m.status === 'new' ? 'filled' : 'outlined'} sx={{ textTransform: 'capitalize' }} />
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

      <ContactMessageDialog message={selected} onClose={() => setSelected(null)} />
    </Box>
  );
}

function ContactMessageDialog({ message, onClose }) {
  const open = Boolean(message);
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      {message && (
        <>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
            <MailRoundedIcon color="primary" fontSize="small" />
            {message.subject || '(no subject)'}
            <IconButton
              onClick={onClose} size="small"
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
                <Chip label={message.status} size="small" sx={{ textTransform: 'capitalize' }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">{message.email}</Typography>
              <Typography variant="caption" color="text.secondary">
                Received {fmtDate(message.createdAt)}
              </Typography>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {message.message}
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              startIcon={<OpenInNewRoundedIcon />}
              href={`mailto:${message.email}?subject=${encodeURIComponent(
                `Re: ${message.subject || 'Your message to Audivo'}`
              )}`}
            >
              Reply by email
            </Button>
            <Button variant="contained" disableElevation onClick={onClose}>Close</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}