import {Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Divider, Box, Typography,} from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useUIPreferences } from '../../context/UIPreferencesContext';
import { PERMISSIONS } from '../../auth/permissions';
import ProfileMenu from '../ProfileMenu';
import {
  DASHBOARD,
  BROWSE,
  LIBRARY,
  UPLOAD,
  SONGS,
  FEATURE,
  USERS,
  ANALYTICS,
  MODERATE,
  ROLES,
  ADMINS,
  CONTACT_QUERIES,
} from '../../constants/route_constant';

const DRAWER_WIDTH = 240;

const baseItems = [
  { label: 'Home', icon: <HomeRoundedIcon />, path: DASHBOARD },
  { label: 'Browse', icon: <SearchRoundedIcon />, path: BROWSE },
  { label: 'Library', icon: <LibraryMusicRoundedIcon />, path: LIBRARY },
];

const gatedItems = [
  { label: 'Upload Songs',  icon: <CloudUploadRoundedIcon />,        path: UPLOAD,    permission: PERMISSIONS.UPLOAD_SONGS },
  { label: 'Delete Songs',  icon: <DeleteRoundedIcon />,             path: SONGS,     permission: PERMISSIONS.DELETE_SONGS },
  { label: 'Feature Songs', icon: <StarRoundedIcon />,               path: FEATURE,   permission: PERMISSIONS.FEATURE_SONGS },
  { label: 'Manage Users',  icon: <PeopleRoundedIcon />,             path: USERS,     permission: PERMISSIONS.MANAGE_USERS },
  { label: 'Contact Queries', icon: <MailRoundedIcon />,             path: CONTACT_QUERIES, permission: PERMISSIONS.MANAGE_USERS },
  { label: 'Analytics',     icon: <BarChartRoundedIcon />,           path: ANALYTICS, permission: PERMISSIONS.VIEW_ANALYTICS },
  { label: 'Moderate',      icon: <ForumRoundedIcon />,              path: MODERATE,  permission: PERMISSIONS.MODERATE_COMMENTS },
  { label: 'Manage Roles',  icon: <AdminPanelSettingsRoundedIcon />, path: ROLES,     permission: PERMISSIONS.MANAGE_ROLES },
];

const superAdminItems = [
  { label: 'Manage Admins', icon: <ShieldRoundedIcon />, path: ADMINS },
];

export default function Sidebar() {
  const { user, can } = useAuth();
  const { sidebarHidden } = useUIPreferences();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Hidden by user preference — render nothing so the main area reclaims the space.
  if (sidebarHidden) return null;

  const visibleGated = [
    ...gatedItems.filter((item) => can(item.permission)),
    ...(user?.role === 'Super Admin' ? superAdminItems : []),
  ];

  const renderItem = (item) => (
    <ListItemButton key={item.path} selected={pathname === item.path}
      onClick={() => navigate(item.path)} sx={{ borderRadius: 2, mx: 1, mb: 0.5 }}>
      <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );

  return (
    <Drawer variant="permanent"
      sx={{
        width: DRAWER_WIDTH, flexShrink: 0, display: { xs: 'none', md: 'block' },
        [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider' },
      }}>
      <Toolbar /> {/* spacer so the content starts below the fixed header */}

      <Box sx={{ height: 'calc(100% - 64px)', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ overflow: 'auto', py: 1, flexGrow: 1 }}>
          <List>{baseItems.map(renderItem)}</List>
          {visibleGated.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="overline" sx={{ px: 3, color: 'text.secondary' }}>
                {user.role} tools
              </Typography>
              <List>{visibleGated.map(renderItem)}</List>
            </>
          )}
        </Box>

        {user && (
          <>
            <Divider />
            <ProfileMenu />
          </>
        )}
      </Box>
    </Drawer>
  );
}