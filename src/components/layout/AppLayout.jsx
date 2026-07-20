import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNavDrawer from './MobileNavDrawer';
import { useAuth } from '../../store/hooks/useAuth';
import { useSidebar } from '../../store/hooks/useSidebar';
import ChangePasswordDialog from '../ChangePasswordDialog';
import { PLAYBAR_HEIGHT, CONTENT_BOTTOM_GAP } from '../../constants/layout';

export default function AppLayout() {
  const { user, refreshUser } = useAuth();
  const { playbarHidden } = useSidebar();
  const current = useSelector((s) => s.player.current);
  const mustChange = !!user?.mustChangePassword;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const playbarVisible = Boolean(current) && !playbarHidden;
  const bottomPad = playbarVisible ? PLAYBAR_HEIGHT + CONTENT_BOTTOM_GAP : CONTENT_BOTTOM_GAP;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header onOpenMobileNav={() => setMobileNavOpen(true)} />
      <Sidebar />
      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar /> {/* offsets the fixed header */}

        <Box
          sx={{
            px: { xs: 2, sm: 3, lg: 4 },
            pt: 4,
            pb: `${bottomPad}px`,
            transition: (t) => t.transitions.create('padding-bottom', {
              duration: t.transitions.duration.shortest,
            }),
          }}
        >
          <Outlet /> {/* the current page renders here */}
        </Box>
      </Box>

      <ChangePasswordDialog open={mustChange} forced onSuccess={refreshUser} />
    </Box>
  );
}