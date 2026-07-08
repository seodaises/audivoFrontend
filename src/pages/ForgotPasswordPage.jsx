import { useState } from 'react';
import { Box, Card, CardContent, Typography, Stack, TextField, Button, Alert, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { api } from '../api/client';
import { LOGIN } from '../constants/route_constant';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [devUrl, setDevUrl] = useState(null);
  const [err, setErr] = useState(null);

  const handleSubmit = async () => {
    setLoading(true); setErr(null); setMsg(null); setDevUrl(null);
    try {
      const { message, data } = await api('/auth/forgot-password', { method: 'POST', body: { email } });
      setMsg(message); // generic — never reveals whether the email exists
      if (data?.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Card sx={{ maxWidth: 420, width: '100%' }} elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Reset your password</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Enter your email and we'll send a reset link.
          </Typography>

          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          {msg && <Alert severity="success" sx={{ mb: 2 }}>{msg}</Alert>}
          {devUrl && (
            <Alert severity="info" sx={{ mb: 2, wordBreak: 'break-all' }}>
              Dev shortcut (email is off): <Link href={devUrl}>{devUrl}</Link>
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField label="Email" type="email" fullWidth value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />
            <Button variant="contained" size="large" disableElevation
              onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
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