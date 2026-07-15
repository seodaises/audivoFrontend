import { Box, Typography, Stack, Paper, Skeleton, useTheme, alpha } from '@mui/material';

// A concentric-arc chart: each genre gets its OWN ring at its own radius, and the arc sweeps proportionally to that genre's share of total plays.
// WHY NOT A PIE: a pie forces every slice into one circle, so a genre with 2% of plays becomes an unreadable sliver. Concentric arcs give every genre a full ring of its own — the LENGTH of the sweep carries the value, and even a small genre still gets a visible, hoverable arc. The trade-off is that comparing arcs at different radii is harder than comparing pie slices, which is exactly why the legend on the left carries the real numbers. The chart shows the SHAPE; the legend shows the DATA.
// WHY HAND-ROLLED SVG, NOT A CHART LIBRARY: this is ~40 lines. recharts is ~500KB and doesn't know about the MUI theme, so every colour would need re-wiring on the day/night toggle. Here the arcs read straight from the palette, so dark mode is free. If the analytics page later needs five different chart types, that's when a library starts earning its weight — not for one donut.
// THE TRICK — no arc maths, no path commands, no sweep flags. Each ring is a plain <circle> with a DASHED stroke: strokeDasharray is set to [visible, gap], where `visible` is exactly the fraction of the circumference we want painted. Rotate -90° so the arc starts at 12 o'clock, where a human expects a chart to begin. That's the entire chart.

const SIZE = 200;      // square viewBox; the SVG scales to whatever box it's in
const CENTER = SIZE / 2;
const OUTER_R = 88;    // radius of the outermost (biggest) ring
const RING_GAP = 15;   // distance between consecutive rings
const STROKE = 9;
const MAX_RINGS = 5;   // past ~5 the inner rings get too small to read

// The rings are all the SAME hue (Audivo amber), stepped in opacity — one branded
// ramp, exactly like the reference. Pulling five unrelated MUI palette colours
// (info blue, secondary purple) would have been faster and would have made the
// dashboard look like a Bootstrap demo. The brand colour IS the chart's colour.
const RING_ALPHA = [1, 0.78, 0.58, 0.4, 0.26];

export default function GenrePlaysChart({ data, loading, onClick }) {
  const theme = useTheme();
  const brand = theme.palette.primary.main;

  // Only genres that HAVE plays, top N by volume. A ring with a zero-length arc is
  // a circle that means nothing — it's noise dressed as data.
  const rings = (data || []).filter((g) => g.plays > 0).slice(0, MAX_RINGS);
  const total = rings.reduce((sum, g) => sum + g.plays, 0);
  const clickable = Boolean(rings.length && onClick);
  const ringColor = (i) => alpha(brand, RING_ALPHA[i % RING_ALPHA.length]);

  const shell = (children) => (
    <Paper
      elevation={0}
      onClick={clickable ? onClick : undefined}
      sx={{
        p: 2.5, borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        // Only lift on hover if there's actually somewhere to go. A card that
        // animates but doesn't navigate is a lie told with CSS.
        ...(clickable && {
          '&:hover': { transform: 'translateY(-2px)', boxShadow: 4, borderColor: 'primary.main' },
        }),
      }}
    >
      {children}
    </Paper>
  );

  if (loading) {
    return shell(
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Stack spacing={1} sx={{ flexGrow: 1 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="70%" height={16} />
          ))}
        </Stack>
        <Skeleton variant="circular" width={150} height={150} />
      </Stack>
    );
  }

  // Empty state. A chart of nothing must SAY it's nothing — five grey circles read
  // as a rendering bug, not as "no data yet."
  if (!rings.length) {
    return shell(
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No plays recorded yet — the genre breakdown appears once listeners start playing tracks.
        </Typography>
      </Box>
    );
  }

  return shell(
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: 'center' }}>
      {/* Legend. Carries the exact numbers, so the arcs never have to be read
          PRECISELY — only RELATIVELY. This is the half of the widget that's
          actually accountable. */}
      <Stack spacing={0.9} sx={{ flexGrow: 1, minWidth: 0, width: '100%' }}>
        {rings.map((g, i) => {
          const pct = total > 0 ? Math.round((g.plays / total) * 100) : 0;
          return (
            <Stack key={g.id} direction="row" spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                <Box sx={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, bgcolor: ringColor(i) }} />
                <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>{g.name}</Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary"
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                {g.plays.toLocaleString()} · {pct}%
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      {/* The rings themselves. */}
      <Box sx={{ width: 170, height: 170, flexShrink: 0 }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="img" aria-label="Plays by genre">
          {rings.map((g, i) => {
            const r = OUTER_R - i * RING_GAP;
            const circumference = 2 * Math.PI * r;
            const fraction = total > 0 ? g.plays / total : 0;
            const drawn = circumference * fraction;
            return (
              <g key={g.id}>
                {/* Track: the full circle, faint. This gives the arc a DENOMINATOR
                    to be a fraction of. Without it, a short arc floating in space
                    reads as an absolute quantity instead of a share. */}
                <circle cx={CENTER} cy={CENTER} r={r} fill="none"
                  stroke={alpha(theme.palette.text.primary, 0.08)}
                  strokeWidth={STROKE} />
                {/* Value arc. NOTE: `stroke` as a real SVG attribute, not `sx` —
                    MUI's sx prop only exists on MUI components, and a raw <circle>
                    is not one. Hence useTheme() up top: we resolve the colour in JS
                    and hand SVG a plain string, which is what SVG actually speaks. */}
                <circle cx={CENTER} cy={CENTER} r={r} fill="none"
                  stroke={ringColor(i)}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${drawn} ${circumference - drawn}`}
                  transform={`rotate(-90 ${CENTER} ${CENTER})`}>
                  {/* Native SVG tooltip. Free hover-to-read-exact-value, zero JS. */}
                  <title>{`${g.name}: ${g.plays.toLocaleString()} plays`}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </Box>
    </Stack>
  );
}