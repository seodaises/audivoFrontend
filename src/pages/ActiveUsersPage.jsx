import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Stack, Table, TableHead, TableBody, TableRow,
  TableCell, TableContainer, Chip, Avatar, Alert, Skeleton, Tooltip,
  ToggleButton, ToggleButtonGroup, CircularProgress,
} from '@mui/material';
import OnlinePredictionRoundedIcon from '@mui/icons-material/OnlinePredictionRounded';
import { api } from '../api/client';
import { fmtRelative, fmtDateTime } from '../utils/format';

const roleChipColor = (role) => {
  switch (role) {
    case 'Super Admin': return 'error';
    case 'Admin': return 'primary';
    case 'Moderator': return 'warning';
    case 'Artist': return 'info';
    default: return 'default';
  }
};

const WINDOWS = [
  { label: '5 min', minutes: 5 },
  { label: '30 min', minutes: 30 },
  { label: '24 hr', minutes: 24 * 60 },
];

const initials = (name, email) => {
  const source = (name || email || '?').trim();
  return source.slice(0, 1).toUpperCase();
};

export default function ActiveUsersPage() {
  const [windowMinutes, setWindowMinutes] = useState(5);
  const [data, setData] = useState(null);       // { items, windowMinutes, redisUnavailable }
  const [loading, setLoading] = useState(true);  // first load only
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true); else setLoading(true);
    setErr(null);
    try {
      const { data: res } = await api(`/admin/active-sessions?minutes=${windowMinutes}`);
      setData(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [windowMinutes]);

  useEffect(() => {
    load();
    const intervalId = setInterval(() => load({ silent: true }), 30_000);
    return () => clearInterval(intervalId);
  }, [load]);

  const items = data?.items ?? [];

  return (
    <Box sx={{ pb: 12 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Active Users</Typography>
        {refreshing && <CircularProgress size={16} />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        "Active" means this account made a request in the selected window — any page
        load, playback, or API call counts, not just logging in. "Last login" is the
        actual most recent sign-in from their login history, which is a separate,
        rarer event.
      </Typography>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 3 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={windowMinutes}
          onChange={(_, v) => { if (v != null) setWindowMinutes(v); }}
          aria-label="active window"
        >
          {WINDOWS.map((w) => (
            <ToggleButton key={w.minutes} value={w.minutes}>{w.label}</ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Loading…' : `${items.length} active in the last ${
            windowMinutes >= 60 ? `${windowMinutes / 60}h` : `${windowMinutes}m`
          }`}
        </Typography>
      </Stack>

      {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}

      {data?.redisUnavailable && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Presence data is temporarily unavailable (Redis unreachable) — this list may
          be empty or stale until it reconnects. Last-login data below is unaffected,
          since it comes from the database, not Redis.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Last login</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton width="60%" /></TableCell>
                    <TableCell><Skeleton width={70} /></TableCell>
                    <TableCell><Skeleton width={80} /></TableCell>
                    <TableCell><Skeleton width={100} /></TableCell>
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Box sx={{ textAlign: 'center', py: 6 }}>
                      <OnlinePredictionRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Nobody's been active in this window.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((u) => (
                  <TableRow key={u.id} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: 14 }}>
                          {initials(u.displayName || u.username, u.email)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                            {u.displayName || u.username || 'Unnamed'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {u.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={u.role || '—'} color={roleChipColor(u.role)} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title={fmtDateTime(u.lastActiveAt)}>
                        <Typography variant="body2">{fmtRelative(u.lastActiveAt)}</Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {u.lastLoginAt ? (
                        <Tooltip title={u.lastLoginIp ? `From ${u.lastLoginIp}` : ''}>
                          <Typography variant="body2">
                            {fmtDateTime(u.lastLoginAt)}
                            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                              ({fmtRelative(u.lastLoginAt)})
                            </Typography>
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.secondary">No record</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}