import { useState } from 'react';
import {
  Menu, MenuItem, ListItemIcon, ListItemText, Divider,
  ButtonBase, Avatar, Box, Typography,
} from '@mui/material';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import LockResetRoundedIcon from '@mui/icons-material/LockResetRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../context/AuthContext';
import ProfileDialog from './ProfileDialog';
import ChangePasswordDialog from './ChangePasswordDialog';
import LogoutConfirmDialog from './LogoutConfirmDialog';

export default function ProfileMenu() {
  const { user } = useAuth();
  const [anchor, setAnchor] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!user) return null;

  const open = Boolean(anchor);
  const closeMenu = () => setAnchor(null);

  // Each item closes the menu first, then opens its dialog.
  const openProfile = () => { closeMenu(); setProfileOpen(true); };
  const openPassword = () => { closeMenu(); setPasswordOpen(true); };
  const openLogout = () => { closeMenu(); setLogoutOpen(true); };

  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <>
      {/* The avatar button — clicking anchors the menu to it. */}
      <ButtonBase
        onClick={(e) => setAnchor(e.currentTarget)}
        sx={{
          p: 1.5, width: '100%', justifyContent: 'flex-start', gap: 1.5,
          borderRadius: 0, textAlign: 'left',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        aria-label="Open account menu"
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Avatar src={user.avatarUrl || undefined} sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
          {user.avatarUrl ? null : initial}
        </Avatar>
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
            {user.fullName || user.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {user.email}
          </Typography>
        </Box>
      </ButtonBase>
      
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 220, borderRadius: 2, mb: 1 } } }}
      >
        <MenuItem onClick={openProfile}>
          <ListItemIcon><PersonRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View profile</ListItemText>
        </MenuItem>
        <MenuItem onClick={openPassword}>
          <ListItemIcon><LockResetRoundedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Change password</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={openLogout}>
          <ListItemIcon><LogoutRoundedIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText slotProps={{ primary: { color: 'error' } }}>Log out</ListItemText>
        </MenuItem>
      </Menu>

      <ProfileDialog open={profileOpen} onClose={() => setProfileOpen(false)} />
      <ChangePasswordDialog open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <LogoutConfirmDialog open={logoutOpen} onClose={() => setLogoutOpen(false)} />
    </>
  );
}