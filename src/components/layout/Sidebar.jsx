import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Divider, Box, Typography, Tooltip,
} from '@mui/material';
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
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import LibraryAddCheckRoundedIcon from '@mui/icons-material/LibraryAddCheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/hooks/useAuth';
import { useSidebar } from '../../store/hooks/useSidebar';
import { PERMISSIONS } from '../../auth/permissions';
import ProfileMenu from '../ProfileMenu';
import {
  DASHBOARD, BROWSE, LIBRARY, UPLOAD, SONGS, FEATURE, USERS,
  ANALYTICS, MODERATE, ROLES, ADMINS, CONTACT_QUERIES,
  MANAGE_ARTISTS, MANAGE_CATALOG, MY_ARTIST, MY_CATALOG, PLAYLISTS, DISCOVER
} from '../../constants/route_constant';

// Two widths: full (labels) and rail (icons only). The rail is what "hidden"
// now means — we still show the nav, just collapsed, so it never fully vanishes.
const FULL_WIDTH = 240;
const RAIL_WIDTH = 72;

const baseItems = [
  { label: 'Home', icon: <HomeRoundedIcon />, path: DASHBOARD },
  { label: 'Browse', icon: <SearchRoundedIcon />, path: BROWSE },
  { label: 'Library', icon: <LibraryMusicRoundedIcon />, path: LIBRARY },
  { label: 'Playlists', icon: <QueueMusicRoundedIcon />, path: PLAYLISTS },
  { label: 'Discover', icon: <PublicRoundedIcon />, path: DISCOVER },
];

// `hideForSuperAdmin` marks items a Super Admin shouldn't see even though their
// permission set would otherwise grant them. Upload/Delete Songs are artist-
// facing tools; a Super Admin manages the catalog through Manage Catalog, not
// these per-song pages.
const gatedItems = [
  { label: 'My Catalog',   icon: <Inventory2RoundedIcon />,        path: MY_CATALOG,     permission: PERMISSIONS.UPLOAD_SONGS },
  { label: 'Upload Songs',  icon: <CloudUploadRoundedIcon />,        path: UPLOAD,         permission: PERMISSIONS.UPLOAD_SONGS },
  { label: 'Delete Songs',  icon: <DeleteRoundedIcon />,             path: SONGS,          permission: PERMISSIONS.DELETE_SONGS,  hideForSuperAdmin: true },
  { label: 'Feature Songs', icon: <StarRoundedIcon />,               path: FEATURE,        permission: PERMISSIONS.FEATURE_SONGS },
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
];

export default function Sidebar() {
  const { user, can } = useAuth();
  const { sidebarHidden } = useSidebar();   // true = collapsed to the icon rail
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const rail = sidebarHidden;               // rename for readability below
  const width = rail ? RAIL_WIDTH : FULL_WIDTH;
  const isSuperAdmin = user?.role === 'Super Admin';

  const visibleGated = [
    ...gatedItems.filter(
      (item) => can(item.permission) && !(item.hideForSuperAdmin && isSuperAdmin)
    ),
    ...(isSuperAdmin ? superAdminItems : []),
  ];

  // One row. In rail mode we drop the text label and wrap the button in a
  // Tooltip so hovering the icon still tells you what it is.
  const renderItem = (item) => {
    const button = (
      <ListItemButton
        key={item.path}
        selected={pathname === item.path}
        onClick={() => navigate(item.path)}
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

      <Box sx={{ height: 'calc(100% - 64px)', display: 'flex', flexDirection: 'column' }}>
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
    </Drawer>
  );
}