import { useState } from 'react';
import { Container, Card, CardContent, Typography, ToggleButtonGroup, ToggleButton, TextField, Button, Checkbox, FormControlLabel, Link, Divider, Avatar, Stack, Alert, InputAdornment,} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import HeadphonesRoundedIcon from '@mui/icons-material/HeadphonesRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import { useAuth } from '../context/AuthContext';
import { LOGIN } from '../constants/route_constant';

export default function RegisterPage() {
  const { register, error, loading } = useAuth();

  const [role, setRole] = useState('Listener');      // 'Listener' | 'Artist'
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agree, setAgree] = useState(false);
  const [formError, setFormError] = useState('');
  const [done, setDone] = useState(false);

  const handleRole = (_e, next) => {
    if (next) setRole(next);   
  };

  const cleanUsername = username.trim().toLowerCase();

  const validate = () => {
    if (!displayName.trim()) return 'Please enter your display name.';
    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername))
      return 'Username must be 3-20 characters: lowercase letters, numbers, or underscores.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Please enter a valid email.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    if (!agree) return 'Please agree to the Terms to continue.';
    return '';
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) { setFormError(msg); return; }
    setFormError('');

   const ok = await register(displayName, email, password, cleanUsername, role); 
    if (ok) setDone(true);
  };

  // Success screen (keeps your existing "check your email" behaviour)
  if (done) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Card elevation={3} sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 2 }}>
              <MusicNoteRoundedIcon />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
              Check your email
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              We sent a verification link to <b>{email}</b>. Click it to activate
              your {role.toLowerCase()} account.
            </Typography>
            <Button component={RouterLink} to={LOGIN} variant="contained" disableElevation>
              Back to login
            </Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Card elevation={3} sx={{ borderRadius: 3 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Brand */}
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 0.5 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
              <MusicNoteRoundedIcon fontSize="small" />
            </Avatar>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>Audivo</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Create your account
          </Typography>

          {/* Role picker */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>I'm joining as</Typography>
          <ToggleButtonGroup value={role} exclusive onChange={handleRole} fullWidth sx={{ mb: 3 }}>
            <ToggleButton value="Listener" sx={{ gap: 1, py: 1.25 }}>
              <HeadphonesRoundedIcon fontSize="small" /> Listener
            </ToggleButton>
            <ToggleButton value="Artist" sx={{ gap: 1, py: 1.25 }}>
              <MicRoundedIcon fontSize="small" /> Artist
            </ToggleButton>
          </ToggleButtonGroup>

          {(formError || error) && (
            <Alert severity="error" sx={{ mb: 2 }}>{formError || error}</Alert>
          )}

          {/* Fields */}
          <Stack spacing={2}>
            <TextField
              label={role === 'Artist' ? 'Stage / Artist name' : 'Display name'}
              fullWidth value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <TextField
              label="Username" fullWidth value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={!!username && !/^[a-z0-9_]{3,20}$/.test(cleanUsername)}
              helperText={
                !!username && !/^[a-z0-9_]{3,20}$/.test(cleanUsername)
                  ? '3-20 chars: lowercase letters, numbers, underscores'
                  : 'This is your unique @handle.'
              }
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start">@</InputAdornment>,
                },
              }}
            />
            <TextField
              label="Email" type="email" fullWidth value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password" type="password" fullWidth value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="At least 8 characters."
            />
            <TextField
              label="Confirm password" type="password" fullWidth value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Stack>

          {/* Honest note about the deferred artist-profile step */}
          {role === 'Artist' && (
            <Alert severity="info" sx={{ mt: 2 }}>
              After verifying your email, you'll set up your artist profile —
              genre, country, and more.
            </Alert>
          )}

          <FormControlLabel
            sx={{ mt: 1 }}
            control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />}
            label={<Typography variant="body2">I agree to the Terms of Service</Typography>}
          />

          <Button
            variant="contained" size="large" fullWidth disableElevation
            onClick={handleSubmit} disabled={loading} sx={{ mt: 2 }}
          >
            {loading ? 'Creating account…' : `Register as ${role}`}
          </Button>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" align="center">
            Already have an account?{' '}
            <Link component={RouterLink} to={LOGIN}>Log in</Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}