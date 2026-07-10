import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Alert, Skeleton, TextField,
  MenuItem, IconButton, Tooltip,
} from '@mui/material';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import {
  adminListSongs, adminListAlbums,
  adminSetSongStatus, adminSetAlbumStatus,
} from '../api/catalog';

const STATUS_OPTIONS = ['', 'draft', 'published', 'archived'];
const statusColor = (s) =>
  s === 'published' ? 'success' : s === 'archived' ? 'default' : 'warning';

// Admin catalog console. Two tabs (Songs / Albums), a status filter, and per-row
// status actions. Every write hits the ADMIN endpoints, which bypass ownership
// (requireMinLevel(ADMIN) + manage_catalog) — so an admin can archive/publish
// ANYONE's catalog, which is exactly the requirement. Mirrors the load/err/
// useCallback pattern from ManageUsersPage.
export default function ManageCatalogPage() {
  const [tab, setTab] = useState('songs');      // 'songs' | 'albums'
  const [status, setStatus] = useState('');     // '' = all
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);   // row mid-write, to disable its buttons

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const args = { status: status || undefined, limit: 100 };
      const data = tab === 'songs'
        ? await adminListSongs(args)
        : await adminListAlbums(args);
      setRows(tab === 'songs' ? (data.songs || []) : (data.albums || []));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, status]);

  useEffect(() => { load(); }, [load]);

  // A status write. We flip to the target status, then refetch so the row shows
  // the DB truth (not an optimistic guess).
  const setRowStatus = async (row, nextStatus) => {
    setBusyId(row.id);
    try {
      if (tab === 'songs') await adminSetSongStatus(row.id, nextStatus);
      else await adminSetAlbumStatus(row.id, nextStatus);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  const COLS = 4;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Manage Catalog</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Archive, restore, or publish any artist's songs and albums.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
        sx={{ mb: 2, justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="songs" label="Songs" />
          <Tab value="albums" label="Albums" />
        </Tabs>
        <TextField select size="small" label="Status" value={status}
          onChange={(e) => setStatus(e.target.value)} sx={{ width: 180 }}>
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s || 'all'} value={s}>{s === '' ? 'All statuses' : s}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Artist</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COLS}><Skeleton height={32} /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLS}>
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    Nothing here{status ? ` with status "${status}"` : ''}.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const busy = busyId === row.id;
                const isArchived = row.status === 'archived';
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{row.title}</TableCell>
                    <TableCell>{row.artist?.stageName ?? '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.status}
                        color={statusColor(row.status)} variant="outlined" />
                    </TableCell>
                    <TableCell align="right">
                      {isArchived ? (
                        <Tooltip title="Restore to published">
                          <span>
                            <IconButton size="small" disabled={busy}
                              onClick={() => setRowStatus(row, 'published')}>
                              <UnarchiveRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : (
                        <>
                          {row.status === 'draft' && (
                            <Tooltip title="Publish">
                              <span>
                                <IconButton size="small" disabled={busy}
                                  onClick={() => setRowStatus(row, 'published')}>
                                  <PublishRoundedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip title="Archive">
                            <span>
                              <IconButton size="small" color="warning" disabled={busy}
                                onClick={() => setRowStatus(row, 'archived')}>
                                <Inventory2RoundedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}