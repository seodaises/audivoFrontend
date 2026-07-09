import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../store/hooks/useAuth';

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const checkingSession = useSelector((state) => state.auth.checkingSession);

  if (checkingSession) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}