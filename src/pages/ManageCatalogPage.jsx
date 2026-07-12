import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Tabs, Tab, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Alert, Skeleton, TextField,
  MenuItem, IconButton, Tooltip, Button, Snackbar, InputAdornment,
} from '@mui/material';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import {
  adminListSongs, adminListAlbums,
  adminSetSongStatus, adminSetAlbumStatus,
} from '../api/catalog';
import AddGenreDialog from '../components/AddGenreDialog';
import { useAuth } from '../store/hooks/useAuth';
import { PERMISSIONS } from '../auth/permissions';

const STATUS_OPTIONS = ['', 'draft', 'published', 'archived'];
const statusColor = (s) =>
  s === 'published' ? 'success' : s === 'archived' ? 'default' : 'warning';

// Admin catalog console. Two tabs (Songs / Albums), a status filter, a title
// search, and per-row status actions. Every write hits the ADMIN endpoints,
// which bypass ownership (requireMinLevel(ADMIN) + manage_catalog) — so an admin
// can archive/publish ANYONE's catalog, which is exactly the requirement.
// Mirrors the load/err/useCallback pattern from ManageUsersPage.
export default function ManageCatalogPage() {
  const { can } = useAuth();

  const [tab, setTab] = useState('songs');      // 'songs' | 'albums'
  const [status, setStatus] = useState('');     // '' = all
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);   // row mid-write, to disable its buttons

  // Two search states: `search` is what's in the box (updates on every keystroke,
  // so the input stays responsive), `debounced` is what we actually query with.
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');

  // Genre creation lives here because a genre is catalog metadata, and this is
  // the catalog console. Gated on manage_catalog to match the route's guard.
  const [genreOpen, setGenreOpen] = useState(false);
  const [toast, setToast] = useState('');

  // Wait for a pause in typing before hitting the API — otherwise every keystroke
  // fires a request. 350ms is the usual sweet spot.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const args = {
        status: status || undefined,
        search: debounced || undefined,
        limit: 100,
      };
      const data = tab === 'songs'
        ? await adminListSongs(args)
        : await adminListAlbums(args);
      setRows(tab === 'songs' ? (data.songs || []) : (data.albums || []));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [tab, status, debounced]);

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

  // The empty-state line should say WHY it's empty — status filter, search, or
  // genuinely nothing. Otherwise a search with no hits reads like a broken page.
  const emptyLabel = () => {
    if (debounced) return `No ${tab} matching "${debounced}".`;
    if (status) return `Nothing here with status "${status}".`;
    return 'Nothing here.';
  };

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

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}
          sx={{ alignItems: { sm: 'center' } }}>
          <TextField
            size="small"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 240 } }}
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

          <TextField select size="small" label="Status" value={status}
            onChange={(e) => setStatus(e.target.value)} sx={{ width: 180 }}>
            {STATUS_OPTIONS.map((s) => (
              <MenuItem key={s || 'all'} value={s}>{s === '' ? 'All statuses' : s}</MenuItem>
            ))}
          </TextField>

          {can(PERMISSIONS.MANAGE_CATALOG) && (
            <Button
              variant="outlined"
              startIcon={<AddRoundedIcon />}
              onClick={() => setGenreOpen(true)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add genre
            </Button>
          )}
        </Stack>
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
                    {emptyLabel()}
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

      <AddGenreDialog
        open={genreOpen}
        onClose={() => setGenreOpen(false)}
        onCreated={(g) => setToast(`Genre "${g.name}" added`)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}