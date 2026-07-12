import { Navigate } from 'react-router-dom';
import { Box, Typography, Button, Stack } from '@mui/material';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/hooks/useAuth';
import { DASHBOARD } from '../constants/route_constant';

// Route guard for permission-gated pages. RequireAuth answers "are you logged
// in"; this answers "are you allowed here". Without it, a Listener can reach
// /manage-catalog by typing the URL — the page renders, fires its fetches, and
// paints 403 alerts. The backend still says no (it always did), but the UI
// shouldn't have let them get that far.
//
// Gates on PERMISSION, not role name — same reason the Sidebar does. The
// permission list comes from the DB via /me, so a new role that happens to
// grant manage_catalog works here with zero frontend changes. A hardcoded
// `role === 'admin'` check would silently drift from the seeders.
export default function RequirePermission({ permission, children }) {
  const { can } = useAuth();
  const navigate = useNavigate();

  if (can(permission)) return children;

  // A friendly wall, not a redirect. A silent bounce to the dashboard looks like
  // a bug ("I clicked it and nothing happened"); this tells them what happened.
  return (
    <Box sx={{ textAlign: 'center', py: 10 }}>
      <LockRoundedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
        You don't have access to this page
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Your account doesn't have the permission required to view it.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
        <Button variant="contained" onClick={() => navigate(DASHBOARD)}>
          Back to dashboard
        </Button>
      </Stack>
    </Box>
  );
}