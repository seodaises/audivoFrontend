import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Stack, Alert, Skeleton, Chip } from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { api } from '../api/client';
import GenrePlaysChart from '../components/GenrePlaysChart';

// The analytics destination. It's honest about being unfinished — but it is NOT a
// blank "coming soon" page, because the dashboard sends you here after you clicked
// a chart, and a click that lands on nothing is worse than a card that wasn't
// clickable in the first place.
//
// So: the one real chart we have gets a bigger stage here, and the things that
// aren't built yet are listed EXPLICITLY as what's coming rather than implied by
// absence. A reviewer should be able to tell at a glance which parts are shipped
// and which are scaffolding — that's a more defensible state than a page that
// pretends to be finished.
export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data } = await api('/admin/metrics');
        if (alive) setMetrics(data);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const cat = metrics?.catalog ?? {};
  const playsByGenre = cat.playsByGenre ?? [];

  // What's genuinely not built yet. Naming them beats hiding them.
  const planned = [
    'Plays over time (daily / weekly trend)',
    'Top tracks and top artists by play count',
    'Listener retention and repeat plays',
    'Upload volume by artist',
  ];

  return (
    <Box sx={{ pb: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          Analytics
        </Typography>
        <Chip size="small" label="In progress" color="warning" variant="outlined"
          sx={{ fontWeight: 700 }} />
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Platform-wide listening data. One report is live; the rest are on the way.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(280px, 0.7fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* The one thing that IS built. */}
        <Box>
          <Stack direction="row" spacing={1}
            sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Plays by genre</Typography>
            <Typography variant="caption" color="text.secondary">
              Published tracks only
            </Typography>
          </Stack>
          <GenrePlaysChart data={playsByGenre} loading={loading} />

          <Typography variant="caption" color="text.secondary"
            sx={{ display: 'block', mt: 1.5 }}>
            Each ring is one genre; the arc length is that genre's share of all plays.
            Drafts are excluded (no plays), and archived tracks are excluded (their plays
            are historical, not current listening).
          </Typography>
        </Box>

        {/* What isn't. */}
        <Paper elevation={0}
          sx={{ p: 2.5, borderRadius: 3, border: '1px dashed', borderColor: 'divider' }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
            <ConstructionRoundedIcon sx={{ color: 'warning.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Coming next</Typography>
          </Stack>

          <Stack spacing={1.25}>
            {planned.map((item) => (
              <Stack key={item} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
                <InsightsRoundedIcon
                  sx={{ fontSize: 16, color: 'text.disabled', mt: 0.35, flexShrink: 0 }} />
                <Typography variant="body2" color="text.secondary">{item}</Typography>
              </Stack>
            ))}
          </Stack>

          {/* The honest constraint. Every one of the reports above is a time series,
              and there is currently nowhere to put a time series: songs.play_count is
              a single running total with no history, so we can tell you HOW MANY plays
              a track has but not WHEN they happened. Fixing that is a `plays` table
              (one row per play event), not a chart — which is why these are listed as
              planned rather than half-drawn with fake data. */}
          <Alert severity="info" variant="outlined" sx={{ mt: 2.5, borderRadius: 2 }}>
            <Typography variant="caption">
              These all need play HISTORY, not just play counts. `songs.play_count` is a
              running total with no timestamps — a `plays` event table is the prerequisite.
            </Typography>
          </Alert>
        </Paper>
      </Box>

      {loading && !metrics && (
        <Skeleton variant="rounded" height={4} sx={{ mt: 3, borderRadius: 5 }} />
      )}
    </Box>
  );
}