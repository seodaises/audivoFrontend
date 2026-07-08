import { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, TextField, Button, Alert, Link } from '@mui/material';
import { useSearchParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { api } from '../api/client';
import { LOGIN } from '../constants/route_constant';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setErr(null);
    if (!token) return setErr('Missing or invalid reset token.');
    if (password.length < 8) return setErr('Password must be at least 8 characters.');
    if (password !== confirm) return setErr('Passwords do not match.');
    setLoading(true);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, newPassword: password } });
      setDone(true);
      setTimeout(() => navigate(LOGIN), 1500);
    } catch (e) { setErr(e.message); } // e.g. "Reset token has expired"
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Set a new password</Typography>
          {!token && <Alert severity="error" sx={{ mb: 2 }}>No reset token in the link.</Alert>}
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          {done && <Alert severity="success" sx={{ mb: 2 }}>Password reset. Redirecting to login…</Alert>}

          <Stack spacing={2}>
            <TextField label="New password" type="password" fullWidth value={password}
              onChange={(e) => setPassword(e.target.value)} disabled={done} />
            <TextField label="Confirm new password" type="password" fullWidth value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} disabled={done} />
            <Button variant="contained" size="large" disableElevation
              onClick={handleSubmit} disabled={loading || done}>
              {loading ? 'Resetting…' : 'Reset password'}
            </Button>
          </Stack>

          <Typography variant="body2" align="center" sx={{ mt: 2 }}>
            <Link component={RouterLink} to={LOGIN}>Back to login</Link>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}