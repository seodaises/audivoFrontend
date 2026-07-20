import { useAuth } from '../store/hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import ArtistDashboard from './ArtistDashboard';
import ListenerDashboard from './ListenerDashboard';
import { PERMISSIONS } from '../auth/permissions';

const STAFF_LEVEL = 4;

export default function Dashboard() {
  const { user, can } = useAuth();

  if ((user?.level ?? 0) >= STAFF_LEVEL) {
    return <AdminDashboard />;
  }

  if (can(PERMISSIONS.UPLOAD_SONGS)) {
    return <ArtistDashboard />;
  }

  return <ListenerDashboard />;
}