import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Stack, Chip, LinearProgress, Skeleton, Alert,
  Avatar, List, ListItem, ListItemAvatar, ListItemText,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/hooks/useAuth';
import { api } from '../api/client';
import { PERMISSIONS } from '../auth/permissions';
import { MANAGE_ARTISTS, CONTACT_QUERIES, ANALYTICS } from '../constants/route_constant';
import GenrePlaysChart from '../components/GenrePlaysChart';
import { fmtRelative } from '../utils/format';

import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import PendingActionsRoundedIcon from '@mui/icons-material/PendingActionsRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import OnlinePredictionRoundedIcon from '@mui/icons-material/OnlinePredictionRounded';

const nf = new Intl.NumberFormat();

const roleChipColor = (role) => {
  switch (role) {
    case 'Super Admin': return 'error';
    case 'Admin': return 'primary';
    case 'Moderator': return 'warning';
    case 'Artist': return 'info';
    default: return 'default';
  }
};

function StatCard({ icon, label, value, loading, accent }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2, borderRadius: 3,
        border: '1px solid',
        borderColor: accent ? 'warning.main' : 'divider',
        display: 'flex', alignItems: 'center', gap: 1.75,
      }}
    >
      <Box
        sx={{
          width: 42, height: 42, borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: accent ? 'warning.main' : 'primary.main',
          color: accent ? 'warning.contrastText' : 'primary.contrastText',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.15 }}>
          {loading ? <Skeleton width={40} /> : value}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {label}
        </Typography>
      </Box>
    </Paper>
  );
}

function ActionCard({ icon, title, description, onClick, count }) {
  const hasWork = Number(count) > 0;
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2, borderRadius: 3, cursor: 'pointer',
        border: '1px solid',
        borderColor: hasWork ? 'warning.main' : 'divider',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4, borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.75 }}>
        <Box sx={{ color: hasWork ? 'warning.main' : 'primary.main', display: 'flex' }}>
          {icon}
        </Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>{title}</Typography>
        {hasWork && (
          <Chip size="small" color="warning" label={count} sx={{ fontWeight: 700, height: 20 }} />
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {description}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1, color: 'primary.main' }}>
        <Typography variant="button" sx={{ fontSize: 12 }}>Open</Typography>
        <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
      </Stack>
    </Paper>
  );
}

function BreakdownRow({ label, value, total, caption, color = 'primary' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Box sx={{ py: 1.1 }}>
      <Stack direction="row" spacing={2}
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.6 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{label}</Typography>
        <Typography variant="caption" color="text.secondary"
          sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
          {caption}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={pct}
        aria-label={`${label}: ${pct}%`}
        sx={{
          height: 8, borderRadius: 5,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: `${color}.main` },
        }}
      />
    </Box>
  );
}

function PanelSkeleton({ rows = 4 }) {
  return (
    <Stack spacing={2}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i}>
          <Skeleton width="30%" height={20} />
          <Skeleton variant="rounded" height={8} sx={{ mt: 1, borderRadius: 5 }} />
        </Box>
      ))}
    </Stack>
  );
}

export default function AdminDashboard() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || user?.email?.split('@')[0] || 'there';

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const isSuperAdmin = (user?.level ?? 0) >= 5;

  const [presence, setPresence] = useState(null); // { count } or { items, windowMinutes }
  const [presenceLoading, setPresenceLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadPresence = async () => {
      try {
        const { data } = isSuperAdmin
          ? await api('/admin/active-sessions')
          : await api('/admin/active-sessions/count');
        if (alive) setPresence(data);
      } catch {
        if (alive) setPresence(null);
      } finally {
        if (alive) setPresenceLoading(false);
      }
    };

    loadPresence();
    const intervalId = setInterval(loadPresence, 30_000);

    return () => {
      alive = false;
      clearInterval(intervalId);
    };
  }, [isSuperAdmin]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data } = await api('/admin/metrics');
        if (alive) setMetrics(data);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);


  const cat = metrics?.catalog ?? {};
  const inbox = metrics?.inbox ?? {};
  const pendingArtists = cat.pendingArtists ?? 0;
  const newQueries = inbox.newQueries ?? 0;
  const playsByGenre = cat.playsByGenre ?? [];

  const val = (n) => (n == null ? '—' : nf.format(n));
  const activeNow = presence ? (isSuperAdmin ? presence.items?.length ?? 0 : presence.count ?? 0) : null;
  const totalSongs = cat.totalSongs ?? 0;
  const totalAlbums = cat.totalAlbums ?? 0;

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', mb: 0.5 }}>
        Admin Overview
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {name}. Here's the state of Audivo at a glance.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 2, mb: 4,
        }}
      >
        <StatCard icon={<PeopleRoundedIcon />} label="Total users"
          value={val(metrics?.totalUsers)} loading={loading} />
        <StatCard icon={<OnlinePredictionRoundedIcon />} label="Active now"
          value={val(activeNow)} loading={presenceLoading} />
        <StatCard icon={<CheckCircleRoundedIcon />} label="Active users"
          value={val(metrics?.activeUsers)} loading={loading} />
        <StatCard icon={<BlockRoundedIcon />} label="Inactive users"
          value={val(metrics?.inactiveUsers)} loading={loading} />
        <StatCard icon={<LibraryMusicRoundedIcon />} label="Songs"
          value={val(cat.totalSongs)} loading={loading} />
        <StatCard icon={<AlbumRoundedIcon />} label="Albums"
          value={val(cat.totalAlbums)} loading={loading} />
        <StatCard icon={<MicRoundedIcon />} label="Artists"
          value={val(cat.totalArtists)} loading={loading} />
        <StatCard icon={<PlayCircleRoundedIcon />} label="Total plays"
          value={val(cat.totalPlays)} loading={loading} />
        <StatCard icon={<PendingActionsRoundedIcon />} label="Pending verification"
          value={val(cat.pendingArtists)} loading={loading}
          accent={!loading && pendingArtists > 0} />
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* LEFT — the data */}
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Users by role</Typography>
            <Paper elevation={0}
              sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              {loading ? (
                <PanelSkeleton rows={4} />
              ) : metrics && metrics.byRole.length > 0 ? (
                <Stack divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}>
                  {metrics.byRole.map((r) => (
                    <BreakdownRow
                      key={r.role}
                      label={r.role}
                      value={r.active}
                      total={r.total}
                      caption={`${r.active} active · ${r.inactive} inactive · ${r.total} total`}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No user data to display yet.
                </Typography>
              )}
            </Paper>
          </Box>

          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Catalog record</Typography>
            <Paper elevation={0}
              sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              {loading ? (
                <PanelSkeleton rows={5} />
              ) : totalSongs > 0 || totalAlbums > 0 ? (
                <Stack divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}>
                  <BreakdownRow
                    label="Published songs" color="success"
                    value={cat.publishedSongs ?? 0} total={totalSongs}
                    caption={`${cat.publishedSongs ?? 0} of ${totalSongs} songs live`}
                  />
                  <BreakdownRow
                    label="Published albums" color="success"
                    value={cat.publishedAlbums ?? 0} total={totalAlbums}
                    caption={`${cat.publishedAlbums ?? 0} of ${totalAlbums} albums live`}
                  />
                  <BreakdownRow
                    label="Archived songs" color="primary"
                    value={cat.archivedSongs ?? 0} total={totalSongs}
                    caption={`${cat.archivedSongs ?? 0} pulled from Browse`}
                  />
                  <BreakdownRow
                    label="Archived albums" color="primary"
                    value={cat.archivedAlbums ?? 0} total={totalAlbums}
                    caption={`${cat.archivedAlbums ?? 0} pulled from Browse`}
                  />
                  <BreakdownRow
                    label="Verified artists" color="success"
                    value={cat.verifiedArtists ?? 0} total={cat.totalArtists ?? 0}
                    caption={`${cat.verifiedArtists ?? 0} of ${cat.totalArtists ?? 0} verified`}
                  />
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No songs in the catalog yet.
                </Typography>
              )}
            </Paper>
          </Box>
        </Stack>

        {/* RIGHT — the action rail, and now the chart. */}
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Quick actions</Typography>

          {can(PERMISSIONS.MANAGE_CATALOG) && (
            <ActionCard
              icon={<VerifiedUserRoundedIcon />}
              title="Manage artists"
              description="Review and verify pending artist profiles."
              onClick={() => navigate(MANAGE_ARTISTS)}
              count={pendingArtists}
            />
          )}
          {can(PERMISSIONS.MANAGE_USERS) && (
            <ActionCard
              icon={<MailRoundedIcon />}
              title="Contact queries"
              description="Unresolved messages from the contact form."
              onClick={() => navigate(CONTACT_QUERIES)}
              count={newQueries}
            />
          )}

          {can(PERMISSIONS.VIEW_ANALYTICS) && (
            <Box sx={{ pt: 1 }}>
              <Stack direction="row" spacing={1}
                sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Plays by genre</Typography>
                <Typography variant="caption" color="text.secondary">
                  Published tracks
                </Typography>
              </Stack>
              <GenrePlaysChart
                data={playsByGenre}
                loading={loading}
                onClick={() => navigate(ANALYTICS)}
              />
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}