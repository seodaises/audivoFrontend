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
import ManageArtistsPage from './pages/ManageArtistsPage';
import BrowsePage from './pages/BrowsePage';
import ArtistStudioPage from './pages/ArtistStudioPage';
import PlayerProvider from './components/PlayerProvider';
import NowPlayingBar from './components/NowPlayingBar';
import LibraryPage from './pages/LibraryPage';
import MyCatalogPage from './pages/MyCatalogPage';
import AlbumPage from './pages/AlbumPage';
import ArtistPage from './pages/ArtistPage';
import ManageCatalogPage from './pages/ManageCatalogPage';
import MyArtistProfilePage from './pages/MyArtistProfilePage';
import RequirePermission from './components/RequirePermission';
import PlaylistsPage from './pages/PlaylistsPage';
import PlaylistPage from './pages/PlaylistPage';
import DiscoverPage from './pages/DiscoverPage';
import { PERMISSIONS } from './auth/permissions';
import AnalyticsPage from './pages/AnalyticsPage';
import {LOGIN, REGISTER, RESET_PASSWORD, DASHBOARD, BROWSE, LIBRARY, UPLOAD, SONGS, FEATURE, USERS, ANALYTICS, MODERATE, ROLES, ADMINS, CONTACT_QUERIES, MANAGE_ARTISTS, MANAGE_CATALOG, MY_ARTIST, MY_CATALOG, PLAYLISTS, DISCOVER} from './constants/route_constant';

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
      <PlayerProvider>
      <AuthBootstrap />
      <BrowserRouter>
        <Routes>
          {/* Public (logged-out) */}
          <Route path={LOGIN} element={<LoginPage />} />
          <Route path={REGISTER} element={<RegisterPage />} />
          <Route path={RESET_PASSWORD} element={<ResetPasswordPage />} /> 
          {/* Protected (logged-in) */}
         <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
            {/* Open to any authenticated user. */}
            <Route path={DASHBOARD} element={<Dashboard />} />
            <Route path={BROWSE} element={<BrowsePage />} />
            <Route path={LIBRARY} element={<LibraryPage />} />
            <Route path={PLAYLISTS} element={<PlaylistsPage />} />
            <Route path={DISCOVER} element={<DiscoverPage />} />
            <Route path="/playlist/:id" element={<PlaylistPage />} />
            <Route path="/album/:id" element={<AlbumPage />} />
            <Route path="/artist/:username" element={<ArtistPage />} />

            {/* Artist-only. Mirrors the Sidebar's permission map exactly — if a
                nav item is gated on a permission, its route must be too, or the
                URL bar is a way around the sidebar. */}
            <Route path={UPLOAD} element={
              <RequirePermission permission={PERMISSIONS.UPLOAD_SONGS}>
                <ArtistStudioPage />
              </RequirePermission>
            } />
            <Route path={MY_ARTIST} element={
              <RequirePermission permission={PERMISSIONS.UPLOAD_SONGS}>
                <MyArtistProfilePage />
              </RequirePermission>
            } />
            <Route path={MY_CATALOG} element={
             <RequirePermission permission={PERMISSIONS.UPLOAD_SONGS}>
              <MyCatalogPage />
            </RequirePermission>
            } />
            <Route path={SONGS} element={
              <RequirePermission permission={PERMISSIONS.DELETE_SONGS}>
                <Placeholder title="Delete Songs" />
              </RequirePermission>
            } />
            <Route path={FEATURE} element={
              <RequirePermission permission={PERMISSIONS.FEATURE_SONGS}>
                <Placeholder title="Feature Songs" />
              </RequirePermission>
            } />

            {/* Admin. */}
            <Route path={USERS} element={
              <RequirePermission permission={PERMISSIONS.MANAGE_USERS}>
                <ManageUsersPage />
              </RequirePermission>
            } />
            <Route path={CONTACT_QUERIES} element={
              <RequirePermission permission={PERMISSIONS.MANAGE_USERS}>
                <ContactQueriesPage />
              </RequirePermission>
            } />
            <Route path={MANAGE_ARTISTS} element={
              <RequirePermission permission={PERMISSIONS.MANAGE_CATALOG}>
                <ManageArtistsPage />
              </RequirePermission>
            } />
            <Route path={MANAGE_CATALOG} element={
              <RequirePermission permission={PERMISSIONS.MANAGE_CATALOG}>
                <ManageCatalogPage />
              </RequirePermission>
            } />
            <Route path={ANALYTICS} element={
              <RequirePermission permission={PERMISSIONS.VIEW_ANALYTICS}>
                <AnalyticsPage />
              </RequirePermission>
            } />
            <Route path={MODERATE} element={
              <RequirePermission permission={PERMISSIONS.MODERATE_COMMENTS}>
                <Placeholder title="Moderate Comments" />
              </RequirePermission>
            } />

            {/* Super Admin. */}
            <Route path={ROLES} element={
              <RequirePermission permission={PERMISSIONS.MANAGE_ROLES}>
                <ManageRolesPage />
              </RequirePermission>
            } />
            <Route path={ADMINS} element={
              <RequirePermission permission={PERMISSIONS.MANAGE_ROLES}>
                <ManageAdminsPage />
              </RequirePermission>
            } />
          </Route>

          <Route path="*" element={<Navigate to={DASHBOARD} replace />} />
        </Routes>
      </BrowserRouter>
      <NowPlayingBar />
      </PlayerProvider>
    </AppThemeProvider>
  );
}