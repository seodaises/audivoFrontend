import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Stack, Chip, LinearProgress, Skeleton, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { USERS, ROLES, ANALYTICS } from '../constants/route_constant';

import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import ManageAccountsRoundedIcon from '@mui/icons-material/ManageAccountsRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';

function StatCard({ icon, label, value }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 200px', minWidth: 200, p: 2.5, borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 2,
      }}
    >
      <Box
        sx={{
          width: 48, height: 48, borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'primary.main', color: 'primary.contrastText',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>{value}</Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
      </Box>
    </Paper>
  );
}

// A clickable tile that routes somewhere in the admin area.
function ActionCard({ icon, title, description, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        flex: '1 1 240px', minWidth: 240, p: 2.5, borderRadius: 3, cursor: 'pointer',
        border: '1px solid', borderColor: 'divider',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6, borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.5, color: 'primary.main' }}>
        <Typography variant="button">Open</Typography>
        <ArrowForwardRoundedIcon fontSize="small" />
      </Stack>
    </Paper>
  );
}

function RoleBreakdownRow({ role, active, inactive, total }) {
  // Guard against divide-by-zero for a role with no users.
  const activePct = total > 0 ? Math.round((active / total) * 100) : 0;

  return (
    <Box sx={{ py: 1.25 }}>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 0.75 }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{role}</Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {active} active&nbsp;·&nbsp;{inactive} inactive&nbsp;·&nbsp;{total} total
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={activePct}
        aria-label={`${role}: ${activePct}% active`}
        sx={{
          height: 10, borderRadius: 5,
          // The track (unfilled portion) represents inactive users.
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { borderRadius: 5, bgcolor: 'primary.main' },
        }}
      />
    </Box>
  );
}

export default function AdminDashboard() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const name = user?.name || user?.email?.split('@')[0] || 'there';

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

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

  // While loading, tiles show a small skeleton instead of a bare dash.
  const tileValue = (n) =>
    loading ? <Skeleton width={48} height={32} /> : (n ?? '—');

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          Admin overview
        </Typography>
        <Chip label={user?.role || 'Admin'} color="primary" size="small" sx={{ fontWeight: 700 }} />
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome back, {name}. Here's the state of Audivo at a glance.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}

      {/* Top-line metrics — Total / Active / Inactive */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <StatCard
          icon={<PeopleRoundedIcon />}
          label="Total users"
          value={tileValue(metrics?.totalUsers)}
        />
        <StatCard
          icon={<CheckCircleRoundedIcon />}
          label="Active users"
          value={tileValue(metrics?.activeUsers)}
        />
        <StatCard
          icon={<BlockRoundedIcon />}
          label="Inactive users"
          value={tileValue(metrics?.inactiveUsers)}
        />
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Users by role</Typography>
      <Paper
        elevation={0}
        sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 4 }}
      >
        {loading ? (
          <Stack spacing={2}>
            {[0, 1, 2, 3].map((i) => (
              <Box key={i}>
                <Skeleton width="30%" height={20} />
                <Skeleton variant="rounded" height={10} sx={{ mt: 1, borderRadius: 5 }} />
              </Box>
            ))}
          </Stack>
        ) : metrics && metrics.byRole.length > 0 ? (
          <Stack divider={<Box sx={{ borderBottom: '1px dashed', borderColor: 'divider' }} />}>
            {metrics.byRole.map((r) => (
              <RoleBreakdownRow
                key={r.role}
                role={r.role}
                active={r.active}
                inactive={r.inactive}
                total={r.total}
              />
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No user data to display yet.
          </Typography>
        )}
      </Paper>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Quick actions</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {can('manage_users') && (
          <ActionCard
            icon={<ManageAccountsRoundedIcon />}
            title="Manage users"
            description="View accounts, search users, and enable or disable access."
            onClick={() => navigate(USERS)}
          />
        )}
        {can('view_analytics') && (
          <ActionCard
            icon={<BarChartRoundedIcon />}
            title="Analytics"
            description="Track listens, growth, and engagement across Audivo."
            onClick={() => navigate(ANALYTICS)}
          />
        )}
      </Box>

      {can('manage_roles') && (
        <Box sx={{ mt: 4 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
            <AdminPanelSettingsRoundedIcon sx={{ color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Super Admin</Typography>
            <Chip label="Elevated" size="small" variant="outlined" color="primary" />
          </Stack>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <ActionCard
              icon={<AdminPanelSettingsRoundedIcon />}
              title="Manage roles"
              description="Assign roles and create new admin accounts."
              onClick={() => navigate(ROLES)}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}