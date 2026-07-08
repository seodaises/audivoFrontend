import { AppBar, Toolbar, Box, Typography, IconButton, Stack, Button, Chip, Tooltip } from '@mui/material';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../context/ColorModeContext';
import { useUIPreferences } from '../../context/UIPreferencesContext';
import { useAuth } from '../../context/AuthContext';
import { LOGIN } from '../../constants/route_constant';

export default function Header() {
  const { mode, toggle } = useColorMode();
  const { sidebarHidden, toggleSidebar } = useUIPreferences();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <AppBar position="fixed" elevation={0} color="default"
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1, // sit ABOVE the sidebar
        borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(18,18,18,0.8)' : 'rgba(255,255,255,0.8)'),
      }}>
      <Toolbar sx={{ gap: 1 }}>
        {/* Sidebar toggle — only meaningful when logged in (md+ where the drawer lives) */}
        {user && (
          <Tooltip title={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}>
            <IconButton
              onClick={toggleSidebar}
              color="inherit"
              edge="start"
              aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              {sidebarHidden ? <MenuRoundedIcon /> : <MenuOpenRoundedIcon />}
            </IconButton>
          </Tooltip>
        )}

        <Stack direction="row" alignItems="center" spacing={1}>
          <MusicNoteRoundedIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800 }}>Audivo</Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <IconButton onClick={toggle} color="inherit" aria-label="toggle day/night mode">
          {mode === 'dark' ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
        </IconButton>

        {user ? (
          <Chip label={user.role} color="primary" variant="outlined" size="small"
            sx={{ ml: 0.5, display: { xs: 'none', sm: 'flex' } }} />
        ) : (
          <Button variant="contained" color="primary" disableElevation onClick={() => navigate(LOGIN)}>
            Log in
          </Button>
        )}
      </Toolbar>
    </AppBar>
  );
}