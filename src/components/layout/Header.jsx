import { AppBar, Toolbar, Box, Typography, IconButton, Stack, Button, Chip, Tooltip, useTheme, useMediaQuery } from '@mui/material';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import MenuOpenRoundedIcon from '@mui/icons-material/MenuOpenRounded';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../store/hooks/useColorMode';
import { useSidebar } from '../../store/hooks/useSidebar';
import { useAuth } from '../../store/hooks/useAuth';
import { LOGIN } from '../../constants/route_constant';

export default function Header({ onOpenMobileNav }) {
  const { mode, toggle } = useColorMode();
  const { sidebarHidden, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const handleClick = () => {
    if (isDesktop) toggleSidebar();
    else onOpenMobileNav?.();
  };
  const label = isDesktop ? (sidebarHidden ? 'Show sidebar' : 'Hide sidebar') : 'Open menu';

  return (
    <AppBar position="fixed" elevation={0} color="default"
      sx={{
        zIndex: (t) => t.zIndex.drawer + 1, // sit ABOVE the sidebar
        borderBottom: 1, borderColor: 'divider', backdropFilter: 'blur(8px)',
        bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(18,18,18,0.8)' : 'rgba(255,255,255,0.8)'),
      }}>
      <Toolbar sx={{ gap: 1 }}>
        {/* Sidebar toggle on desktop, menu-open on mobile — visible at every
            width now, since a phone with no button and no drawer had no way
            to navigate at all. */}
        {user && (
          <Tooltip title={label}>
            <IconButton
              onClick={handleClick}
              color="inherit"
              edge="start"
              aria-label={label}
            >
              {isDesktop
                ? (sidebarHidden ? <MenuRoundedIcon /> : <MenuOpenRoundedIcon />)
                : <MenuRoundedIcon />}
            </IconButton>
          </Tooltip>
        )}

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
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