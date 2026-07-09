import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from './theme/theme';
import { useColorMode } from './store/hooks/useColorMode';
import { refreshUser } from './store/slices/authSlice';
import RequireAuth from './components/RequireAuth';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Dashboard from './pages/Dashboard';
import ManageUsersPage from './pages/ManageUsersPage';
import ManageRolesPage from './pages/ManageRolesPage';
import ManageAdminsPage from './pages/ManageAdminsPage';
import ContactQueriesPage from './pages/ContactQueriesPage';
import {LOGIN, REGISTER, RESET_PASSWORD, DASHBOARD, BROWSE, LIBRARY, UPLOAD, SONGS, FEATURE, USERS, ANALYTICS, MODERATE, ROLES, ADMINS, CONTACT_QUERIES,} from './constants/route_constant';

const Placeholder = ({ title }) => <Typography variant="h4" sx={{ fontWeight: 800 }}>{title}</Typography>;

function AppThemeProvider({ children }) {
  const { mode } = useColorMode();
  const theme = getTheme(mode);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

function AuthBootstrap() {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(refreshUser());
  }, [dispatch]);

  return null;
}

export default function App() {
  return (
    <AppThemeProvider>
      <AuthBootstrap />
      <BrowserRouter>
        <Routes>
          {/* Public (logged-out) */}
          <Route path={LOGIN} element={<LoginPage />} />
          <Route path={REGISTER} element={<RegisterPage />} />
          <Route path={RESET_PASSWORD} element={<ResetPasswordPage />} />

          {/* Requires login */}
          <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route path={DASHBOARD} element={<Dashboard />} />
            <Route path={BROWSE} element={<Placeholder title="Browse" />} />
            <Route path={LIBRARY} element={<Placeholder title="Library" />} />
            <Route path={UPLOAD} element={<Placeholder title="Upload Songs" />} />
            <Route path={SONGS} element={<Placeholder title="Delete Songs" />} />
            <Route path={FEATURE} element={<Placeholder title="Feature Songs" />} />
            <Route path={USERS} element={<ManageUsersPage />} />
            <Route path={ANALYTICS} element={<Placeholder title="Analytics" />} />
            <Route path={MODERATE} element={<Placeholder title="Moderate Comments" />} />
            <Route path={ROLES} element={<ManageRolesPage />} />
            <Route path={ADMINS} element={<ManageAdminsPage />} />
            <Route path={CONTACT_QUERIES} element={<ContactQueriesPage />} />
          </Route>

          <Route path="*" element={<Navigate to={DASHBOARD} replace />} />
        </Routes>
      </BrowserRouter>
    </AppThemeProvider>
  );
}