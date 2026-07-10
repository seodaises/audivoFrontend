import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Button, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Avatar, Alert, Skeleton, TablePagination,
  ToggleButton, ToggleButtonGroup, Snackbar, Link,
} from '@mui/material';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { useNavigate } from 'react-router-dom';
import { adminListArtists, verifyArtist } from '../api/catalog';

// Admin page: the artist verification queue. Unverified artists can't publish
// (createAlbum requires a verified profile), so this is where an admin approves
// them. The `filter` toggle defaults to "Pending" — the actionable view.
export default function ManageArtistsPage() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);      // MUI TablePagination is 0-indexed
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState(null);

  // 'pending' | 'verified' | 'all'
  const [filter, setFilter] = useState('pending');

  const verifiedParam =
    filter === 'pending' ? false : filter === 'verified' ? true : undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await adminListArtists({
        verified: verifiedParam,
        page: page + 1,          // backend is 1-indexed
        limit,
      });
      setRows(res.artists || []);
      setTotal(res.pagination?.total ?? 0);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [verifiedParam, page, limit]);

  useEffect(() => { load(); }, [load]);

  const onToggleVerify = async (artist, nextVerified) => {
    setBusyId(artist.id);
    setErr(null);
    try {
      await verifyArtist(artist.id, nextVerified);
      setToast(nextVerified ? `Verified ${artist.stageName}` : `Revoked ${artist.stageName}`);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3, justifyContent: 'space-between', alignItems: { sm: 'center' } }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Manage Artists</Typography>
          <Typography variant="body2" color="text.secondary">
            Verify artists so they can publish albums and songs
          </Typography>
        </Box>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={filter}
          onChange={(_, v) => { if (v) { setFilter(v); setPage(0); } }}
        >
          <ToggleButton value="pending">Pending</ToggleButton>
          <ToggleButton value="verified">Verified</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Artist</TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton height={32} /></TableCell>
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                      {filter === 'pending'
                        ? 'No artists waiting for verification.'
                        : 'No artists to show.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar src={a.avatarUrl || undefined} sx={{ width: 36, height: 36, bgcolor: 'primary.main' }}>
                          {(a.stageName || '?').charAt(0).toUpperCase()}
                        </Avatar>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{a.stageName}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {a.user?.username ? (
                        <Link
                          component="button"
                          underline="hover"
                          onClick={() => navigate(`/artist/${a.user.username}`)}
                        >
                          @{a.user.username}
                        </Link>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {a.user?.email ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={a.isVerified ? <VerifiedRoundedIcon /> : undefined}
                        label={a.isVerified ? 'Verified' : 'Pending'}
                        color={a.isVerified ? 'success' : 'warning'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {a.isVerified ? (
                        <Button
                          size="small"
                          color="warning"
                          startIcon={<BlockRoundedIcon />}
                          disabled={busyId === a.id}
                          onClick={() => onToggleVerify(a, false)}
                        >
                          Revoke
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          startIcon={<CheckCircleRoundedIcon />}
                          disabled={busyId === a.id}
                          onClick={() => onToggleVerify(a, true)}
                        >
                          Verify
                        </Button>
                      )}
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