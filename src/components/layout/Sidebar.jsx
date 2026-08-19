import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Divider, Box, Typography, Tooltip,
} from '@mui/material';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ForumRoundedIcon from '@mui/icons-material/ForumRounded';
import MailRoundedIcon from '@mui/icons-material/MailRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import ShieldRoundedIcon from '@mui/icons-material/ShieldRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import LibraryAddCheckRoundedIcon from '@mui/icons-material/LibraryAddCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import OnlinePredictionRoundedIcon from '@mui/icons-material/OnlinePredictionRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/hooks/useAuth';
import { useSidebar } from '../../store/hooks/useSidebar';
import { PERMISSIONS } from '../../auth/permissions';
import ProfileMenu from '../ProfileMenu';
import {
  DASHBOARD, BROWSE, LIBRARY, UPLOAD, USERS,
  ANALYTICS, MODERATE, ROLES, ADMINS, ACTIVE_USERS, CONTACT_QUERIES,
  MANAGE_ARTISTS, MANAGE_CATALOG, MY_ARTIST, MY_CATALOG, PLAYLISTS, DISCOVER, SEARCH
} from '../../constants/route_constant';

const FULL_WIDTH = 240;
const RAIL_WIDTH = 72;

const baseItems = [
  { label: 'Home', icon: <HomeRoundedIcon />, path: DASHBOARD },
  { label: 'Search', icon: <SearchRoundedIcon />, path: SEARCH },
  { label: 'Browse', icon: <GridViewRoundedIcon />, path: BROWSE },
  { label: 'Library', icon: <LibraryMusicRoundedIcon />, path: LIBRARY },
  { label: 'Playlists', icon: <QueueMusicRoundedIcon />, path: PLAYLISTS },
  { label: 'Discover', icon: <PublicRoundedIcon />, path: DISCOVER },
];

const gatedItems = [
  { label: 'My Catalog',   icon: <Inventory2RoundedIcon />,        path: MY_CATALOG,     permission: PERMISSIONS.UPLOAD_SONGS },
  { label: 'Upload Songs',  icon: <CloudUploadRoundedIcon />,        path: UPLOAD,         permission: PERMISSIONS.UPLOAD_SONGS },
  { label: 'Manage Users',  icon: <PeopleRoundedIcon />,             path: USERS,          permission: PERMISSIONS.MANAGE_USERS },
  { label: 'Manage Artists', icon: <VerifiedUserRoundedIcon />,      path: MANAGE_ARTISTS, permission: PERMISSIONS.MANAGE_CATALOG },
  { label: 'Manage Catalog', icon: <LibraryAddCheckRoundedIcon />,   path: MANAGE_CATALOG, permission: PERMISSIONS.MANAGE_CATALOG },
  { label: 'Contact Queries', icon: <MailRoundedIcon />,             path: CONTACT_QUERIES, permission: PERMISSIONS.MANAGE_USERS },
  { label: 'Analytics',     icon: <BarChartRoundedIcon />,           path: ANALYTICS,      permission: PERMISSIONS.VIEW_ANALYTICS },
  { label: 'Moderate',      icon: <ForumRoundedIcon />,              path: MODERATE,       permission: PERMISSIONS.MODERATE_COMMENTS },
  { label: 'Manage Roles',  icon: <AdminPanelSettingsRoundedIcon />, path: ROLES,          permission: PERMISSIONS.MANAGE_ROLES },
  { label: 'My Artist Page', icon: <VerifiedUserRoundedIcon />,      path: MY_ARTIST,      permission: PERMISSIONS.UPLOAD_SONGS },
];

const superAdminItems = [
  { label: 'Manage Admins', icon: <ShieldRoundedIcon />, path: ADMINS },
  { label: 'Active Users', icon: <OnlinePredictionRoundedIcon />, path: ACTIVE_USERS },
];

export function SidebarNav({ rail, onNavigate = () => {} }) {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isSuperAdmin = user?.role === 'Super Admin';

  const visibleGated = [
    ...gatedItems.filter(
      (item) => can(item.permission) && !(item.hideForSuperAdmin && isSuperAdmin)
    ),
    ...(isSuperAdmin ? superAdminItems : []),
  ];
  const renderItem = (item) => {
    const button = (
      <ListItemButton
        key={item.path}
        selected={pathname === item.path}
        onClick={() => { navigate(item.path); onNavigate(); }}
        sx={{
          borderRadius: 2, mx: 1, mb: 0.5,
          justifyContent: rail ? 'center' : 'flex-start',
          px: rail ? 1 : 2,
        }}
      >
        <ListItemIcon sx={{ minWidth: rail ? 0 : 40, justifyContent: 'center' }}>
          {item.icon}
        </ListItemIcon>
        {!rail && <ListItemText primary={item.label} />}
      </ListItemButton>
    );
    // Tooltip only carries its weight in rail mode (labels are hidden there).
    return rail
      ? <Tooltip key={item.path} title={item.label} placement="right">{button}</Tooltip>
      : button;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ overflowY: 'auto', overflowX: 'hidden', py: 1, flexGrow: 1 }}>
        <List>{baseItems.map(renderItem)}</List>
        {visibleGated.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            {!rail && (
              <Typography variant="overline" sx={{ px: 3, color: 'text.secondary' }}>
                {user.role} tools
              </Typography>
            )}
            <List>{visibleGated.map(renderItem)}</List>
          </>
        )}
      </Box>

      {user && (
        <>
          <Divider />
          <ProfileMenu collapsed={rail} />
        </>
      )}
    </Box>
  );
}

export default function Sidebar() {
  const { sidebarHidden } = useSidebar();   // true = collapsed to the icon rail

  const rail = sidebarHidden;               // rename for readability below
  const width = rail ? RAIL_WIDTH : FULL_WIDTH;

  return (
    <Drawer
      variant="permanent"
      sx={{
        width, flexShrink: 0, display: { xs: 'none', md: 'block' },
        // Animate the width so collapse/expand glides instead of snapping.
        transition: (t) => t.transitions.create('width', {
          easing: t.transitions.easing.sharp,
          duration: t.transitions.duration.enteringScreen,
        }),
        [`& .MuiDrawer-paper`]: {
          width, boxSizing: 'border-box', borderRight: 1, borderColor: 'divider',
          overflowX: 'hidden',
          transition: (t) => t.transitions.create('width', {
            easing: t.transitions.easing.sharp,
            duration: t.transitions.duration.enteringScreen,
          }),
        },
      }}
    >
      <Toolbar /> {/* spacer so content starts below the fixed header */}
      <Box sx={{ height: 'calc(100% - 64px)' }}>
        <SidebarNav rail={rail} />
      </Box>
    </Drawer>
  );
}