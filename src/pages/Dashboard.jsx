import { Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import GreetingHeader from '../components/GreetingHeader';
import Shelf from '../components/Shelfs';
import { quickPicks, recentlyPlayed, madeForYou } from '../data/placeholders';
import AdminDashboard from './AdminDashboard';

const STAFF_LEVEL = 4;

export default function Dashboard() {
  const { user } = useAuth();

  if ((user?.level ?? 0) >= STAFF_LEVEL) {
    return <AdminDashboard />;
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