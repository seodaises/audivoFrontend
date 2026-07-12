import { Box } from '@mui/material';
import { useAuth } from '../store/hooks/useAuth';
import GreetingHeader from '../components/GreetingHeader';
import Shelf from '../components/Shelfs';
import { quickPicks, recentlyPlayed, madeForYou } from '../data/placeholders';
import AdminDashboard from './AdminDashboard';
import ArtistDashboard from './ArtistDashboard';
import { PERMISSIONS } from '../auth/permissions';

const STAFF_LEVEL = 4;

// The home route forks by WHO YOU ARE. Same URL, three different pages:
//   staff (Admin+)  -> platform oversight
//   artist          -> their own catalog
//   everyone else   -> the listener shelves
//
// Order matters: staff is checked FIRST. A Super Admin technically holds
// upload_songs in some seeds, but they should never land on the artist view —
// the earlier return wins.
//
// The artist check gates on the PERMISSION, not a role name or level. The
// permission list comes from the DB via /me, so a new role that grants uploading
// works here with zero frontend changes, and there's no magic number to drift
// from the seeders. (STAFF_LEVEL is still a level check — worth unifying later,
// but it works and it isn't what we're changing today.)
export default function Dashboard() {
  const { user, can } = useAuth();

  if ((user?.level ?? 0) >= STAFF_LEVEL) {
    return <AdminDashboard />;
  }

  if (can(PERMISSIONS.UPLOAD_SONGS)) {
    return <ArtistDashboard />;
  }

  return (
    <Box>
      <GreetingHeader />
      <Shelf title="Quick picks" items={quickPicks} />
      <Shelf title="Recently played" items={recentlyPlayed} />
      <Shelf title="Made for you" items={madeForYou} />
    </Box>
  );
}