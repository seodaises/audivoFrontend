import { useEffect } from 'react';
import { Drawer, Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';
import { SidebarNav } from './Sidebar';

// The mobile counterpart to the desktop permanent Sidebar. Always full-width
// labels (rail={false}) — there's no point collapsing to an icon rail on a
// phone, the whole reason rail mode exists on desktop is to claw back screen
// width for content while KEEPING the sidebar visible, and a temporary
// drawer already gives that width back for free by overlaying instead of
// pushing content.
export default function MobileNavDrawer({ open, onClose }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  // If the window grows past the mobile breakpoint while this is open (e.g.
  // rotating a tablet, or resizing a browser window), close it — the
  // permanent Sidebar takes over at that width, and an overlay drawer left
  // open behind it would just be dead, unreachable DOM.
  useEffect(() => {
    if (isDesktop && open) onClose();
  }, [isDesktop, open, onClose]);

  return (
    <Drawer
      variant="temporary"
      anchor="left"
      open={open}
      onClose={onClose}
      ModalProps={{ keepMounted: true }} // better open transition perf on mobile
      sx={{
        display: { xs: 'block', md: 'none' },
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' },
      }}
    >
      <Toolbar /> {/* spacer so content starts below the fixed header */}
      <Box sx={{ height: 'calc(100% - 64px)' }}>
        <SidebarNav rail={false} onNavigate={onClose} />
      </Box>
    </Drawer>
  );
}