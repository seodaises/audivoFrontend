import { useState, useEffect } from 'react';
import { Box, Paper, Typography, Stack, alpha } from '@mui/material';
import ScheduleSendRoundedIcon from '@mui/icons-material/ScheduleSendRounded';

const pad = (n) => String(n).padStart(2, '0');

function useCountdown(target) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return null;
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return null;

  let diff = t - now;
  const live = diff <= 0;
  if (live) return { live: true, d: 0, h: 0, m: 0, s: 0 };

  const d = Math.floor(diff / 86400000); diff -= d * 86400000;
  const h = Math.floor(diff / 3600000); diff -= h * 3600000;
  const m = Math.floor(diff / 60000); diff -= m * 60000;
  const s = Math.floor(diff / 1000);
  return { live: false, d, h, m, s };
}

function Unit({ value, label }) {
  return (
    <Box
      sx={(t) => ({
        flex: 1,
        textAlign: 'center',
        py: 1.75,
        px: 0.5,
        borderRadius: 2,
        bgcolor: alpha(t.palette.primary.main, 0.12),
        border: '1px solid',
        borderColor: alpha(t.palette.primary.main, 0.28),
      })}
    >
      <Typography sx={{
        fontSize: 28, fontWeight: 800, lineHeight: 1, color: 'primary.main',
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
      }}>
        {pad(value)}
      </Typography>
      <Typography sx={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'text.secondary', mt: 1,
      }}>
        {label}
      </Typography>
    </Box>
  );
}

export default function ReleaseCountdown({ releaseAt, title }) {
  const cd = useCountdown(releaseAt);
  if (!cd) return null;

  const target = new Date(releaseAt);

  return (
    <Paper elevation={0}
      sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'primary.main', mb: 0.5 }}>
        <ScheduleSendRoundedIcon fontSize="small" />
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
          Scheduled release
        </Typography>
      </Stack>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.75 }} noWrap>
        {title}
      </Typography>

      {cd.live ? (
        <Box sx={{ py: 1.5 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{
              width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main',
              animation: 'audivoPulse 1.6s ease-in-out infinite',
              '@keyframes audivoPulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
            }} />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Live now
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            This release has gone public.
          </Typography>
        </Box>
      ) : (
        <>
          <Stack direction="row" spacing={1}>
            <Unit value={cd.d} label="Days" />
            <Unit value={cd.h} label="Hours" />
            <Unit value={cd.m} label="Mins" />
            <Unit value={cd.s} label="Secs" />
          </Stack>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1.75 }}>
            Goes live{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {target.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
            </Box>{' '}
            at{' '}
            <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
              {target.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </Box>
          </Typography>
        </>
      )}
    </Paper>
  );
}