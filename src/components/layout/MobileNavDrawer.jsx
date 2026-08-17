import { useEffect } from 'react';
import { Drawer, Box, Toolbar, useTheme, useMediaQuery } from '@mui/material';
import { SidebarNav } from './Sidebar';

export default function MobileNavDrawer({ open, onClose }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

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