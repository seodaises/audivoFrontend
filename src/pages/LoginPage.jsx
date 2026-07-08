import { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, TextField, Button, Alert, Link, Divider } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { useAuth } from '../context/AuthContext';
import { DASHBOARD, FORGOT_PASSWORD, REGISTER } from '../constants/route_constant';
import ContactDialog from '../components/ContactDialog';

export default function LoginPage() {
  const { login, error, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactOpen, setContactOpen] = useState(false);

  const handleSubmit = async () => {
    const ok = await login(email, password);
    if (ok) navigate(DASHBOARD);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <Card sx={{ maxWidth: 400, width: '100%' }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          {/* alignItems/justifyContent belong in sx on MUI v9 Stack — passing them
              as direct props leaks them onto the DOM node (React warning). */}
          <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: 'center', justifyContent: 'center' }}>
            <MusicNoteRoundedIcon color="primary" />
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Audivo</Typography>
          </Stack>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stack spacing={2}>
            <TextField label="Email" type="email" fullWidth value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            <TextField label="Password" type="password" fullWidth value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            <Button variant="contained" size="large" disableElevation
              onClick={handleSubmit} disabled={loading}>
              {loading ? 'Signing in…' : 'Log in'}
            </Button>
          </Stack>

          <Stack spacing={0.5} sx={{ mt: 2, alignItems: 'center' }}>
            <Link component={RouterLink} to={FORGOT_PASSWORD} variant="body2">Forgot password?</Link>
            <Typography variant="body2">
              No account? <Link component={RouterLink} to={REGISTER}>Sign up</Link>
            </Typography>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack sx={{ alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Trouble signing in?{' '}
              <Link component="button" type="button" variant="body2" onClick={() => setContactOpen(true)}>
                Contact us
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
    </Box>
  );
}