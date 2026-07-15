import { Box, Toolbar } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../../store/hooks/useAuth';
import { useSidebar } from '../../store/hooks/useSidebar';
import ChangePasswordDialog from '../ChangePasswordDialog';
import { PLAYBAR_HEIGHT, CONTENT_BOTTOM_GAP } from '../../constants/layout';

export default function AppLayout() {
  const { user, refreshUser } = useAuth();
  const { playbarHidden } = useSidebar();
  const current = useSelector((s) => s.player.current);
  const mustChange = !!user?.mustChangePassword;

  // The playbar is position:fixed, so it does NOT push content up — it floats
  // over it. Something has to reserve the space, and that something is here.
  //
  // It used to be each page's job (`pb: 12`, `pb: 16`, ...). That fails two ways:
  // a page that guesses too small gets clipped (this is what ate the Super Admin
  // card on the Dashboard), and EVERY page pads for a bar that might not exist,
  // leaving dead space when nothing is playing.
  //
  // The layout owns the chrome, so the layout reserves the chrome's space. One
  // rule, applied once: pad iff a bar is actually on screen.
  const playbarVisible = Boolean(current) && !playbarHidden;
  const bottomPad = playbarVisible ? PLAYBAR_HEIGHT + CONTENT_BOTTOM_GAP : CONTENT_BOTTOM_GAP;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Header />
      <Sidebar />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        <Toolbar /> {/* offsets the fixed header */}

        {/* Fluid, not <Container maxWidth="lg">. The old cap pinned content to
            ~1200px, which on a wide monitor left several hundred px of dead
            margin either side. The content here is grid-based (stat cards, role
            bars, media grids) and gets BETTER with width — a 3-across grid
            becomes 4-across for free.

            flexGrow on the parent already sizes this to "whatever the sidebar
            didn't take", so the width is dynamic with the sidebar for free. All
            we add is symmetric padding that grows a little on bigger screens. */}
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