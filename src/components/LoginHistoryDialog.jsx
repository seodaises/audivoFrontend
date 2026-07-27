import { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Stack, Typography, Button, Alert, CircularProgress, Avatar, IconButton,
} from '@mui/material';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DesktopWindowsRoundedIcon from '@mui/icons-material/DesktopWindowsRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import DeviceUnknownRoundedIcon from '@mui/icons-material/DeviceUnknownRounded';
import { fetchLoginHistory } from '../api/auth';

// Turn a raw User-Agent string into a friendly "Browser on OS" label. This is a
// best-effort read of the common cases — the backend stores the full UA, which is
// too noisy to show. Anything we can't recognise falls back to "Unknown device".
const parseUserAgent = (ua) => {
  if (!ua) return { label: 'Unknown device', mobile: false };

  const mobile = /Mobile|Android|iPhone|iPad|iPod/i.test(ua);

  let browser = 'Unknown browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X|Macintosh/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return { label: `${browser} on ${os}`, mobile };
};

const DeviceIcon = ({ ua }) => {
  const { mobile, label } = parseUserAgent(ua);
  if (label === 'Unknown device') return <DeviceUnknownRoundedIcon fontSize="small" />;
  return mobile ? <PhoneAndroidRoundedIcon fontSize="small" /> : <DesktopWindowsRoundedIcon fontSize="small" />;
};

// Split a timestamp into a date line and a time line for the two-line right column.
const formatWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '—', time: '' };
  return {
    date: d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
  };
};

export default function LoginHistoryDialog({ open, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchLoginHistory()
      .then((data) => { if (!cancelled) setRows(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Could not load login history'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <HistoryRoundedIcon color="primary" />
        Login history
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onClose} size="small"><CloseRoundedIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Your most recent sign-ins. If you see something you don&apos;t recognise, change your password.
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!loading && error && <Alert severity="error">{error}</Alert>}

        {!loading && !error && rows.length === 0 && (
          <Alert severity="info">No login history yet.</Alert>
        )}

        {!loading && !error && rows.length > 0 && (
          <Stack divider={<Box sx={{ borderBottom: '0.5px solid', borderColor: 'divider' }} />}>
            {rows.map((r) => {
              const { label } = parseUserAgent(r.userAgent);
              const { date, time } = formatWhen(r.at);
              return (
                <Stack key={r.id} direction="row" spacing={1.5} sx={{ alignItems: 'center', py: 1.25 }}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: 'action.hover', color: 'primary.main' }}>
                    <DeviceIcon ua={r.userAgent} />
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {r.ipAddress || 'Unknown IP'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    <Typography variant="body2" sx={{ lineHeight: 1.3 }}>{date}</Typography>
                    <Typography variant="caption" color="text.secondary">{time}</Typography>
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}