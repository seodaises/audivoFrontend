import { useState, useEffect } from 'react';
import { Box, Typography, Paper, Stack, Alert, Skeleton } from '@mui/material';
import { api } from '../api/client';
import GenrePlaysChart from '../components/GenrePlaysChart';
import PlaysOverTimeChart from '../components/PlaysOverTimeChart';
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
  const topTracks = cat.topTracks ?? [];
  const topArtists = cat.topArtists ?? [];
  const playsOverTime = cat.playsOverTime ?? [];

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', mb: 0.5 }}>
        Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Platform-wide listening data.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}

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

      {/* Top tracks + top artists — all-time, by play count. Published only,
          same rule as the genre report above. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 3,
          mt: 4,
        }}
      >
        <Box>
          <Stack direction="row" spacing={1}
            sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Top tracks</Typography>
            <Typography variant="caption" color="text.secondary">All-time plays</Typography>
          </Stack>
          <TopList
            loading={loading}
            rows={topTracks}
            emptyLabel="No plays yet."
            renderPrimary={(t) => t.title}
            renderSecondary={(t) => t.artist?.stageName ?? ''}
            renderValue={(t) => t.plays}
          />
        </Box>

        <Box>
          <Stack direction="row" spacing={1}
            sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Top artists</Typography>
            <Typography variant="caption" color="text.secondary">All-time plays</Typography>
          </Stack>
          <TopList
            loading={loading}
            rows={topArtists}
            emptyLabel="No plays yet."
            renderPrimary={(a) => a.stageName}
            renderSecondary={() => ''}
            renderValue={(a) => a.plays}
          />
        </Box>
      </Box>

      {/* Plays over time — daily counts, last 14 days, self-plays excluded. */}
      <Box sx={{ mt: 4 }}>
        <Stack direction="row" spacing={1}
          sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Plays over time</Typography>
          <Typography variant="caption" color="text.secondary">Last 14 days</Typography>
        </Stack>
        <PlaysOverTimeChart data={playsOverTime} loading={loading} />
        <Typography variant="caption" color="text.secondary"
          sx={{ display: 'block', mt: 1.5 }}>
          Daily play counts across the platform. Self-plays (artists streaming their own
          tracks) are excluded, matching the play counts shown above.
        </Typography>
      </Box>

      {loading && !metrics && (
        <Skeleton variant="rounded" height={4} sx={{ mt: 3, borderRadius: 5 }} />
      )}
    </Box>
  );
}

function TopList({ loading, rows, emptyLabel, renderPrimary, renderSecondary, renderValue }) {
  return (
    <Paper elevation={0} sx={{ p: 1, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      {loading ? (
        <Stack spacing={1} sx={{ p: 1 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={44} sx={{ borderRadius: 2 }} />
          ))}
        </Stack>
      ) : rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
          {emptyLabel}
        </Typography>
      ) : (
        <Stack>
          {rows.map((row, i) => {
            const secondary = renderSecondary(row);
            return (
              <Stack
                key={row.id}
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: 'center',
                  px: 1.5, py: 1,
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: 'text.secondary', width: 20, flexShrink: 0 }}
                >
                  {i + 1}
                </Typography>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {renderPrimary(row)}
                  </Typography>
                  {secondary && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                      {secondary}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, flexShrink: 0 }}>
                  {Number(renderValue(row)).toLocaleString()}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}