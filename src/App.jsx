import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import { ColorModeProvider } from './context/ColorModeContext';
import { AuthProvider } from './context/AuthContext';
import { UIPreferencesProvider } from './context/UIPreferencesContext';
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
import {LOGIN, REGISTER, FORGOT_PASSWORD, RESET_PASSWORD, DASHBOARD, CHANGE_PASSWORD, BROWSE, LIBRARY, UPLOAD, SONGS, FEATURE, USERS, ANALYTICS, MODERATE, ROLES, ADMINS, CONTACT_QUERIES,} from './constants/route_constant';

const Placeholder = ({ title }) => <Typography variant="h4" sx={{ fontWeight: 800 }}>{title}</Typography>;

export default function App() {
  return (
    <ColorModeProvider>
      <AuthProvider>
        <UIPreferencesProvider>
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
        </UIPreferencesProvider>
      </AuthProvider>
    </ColorModeProvider>
  );
}