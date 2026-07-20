import { useState } from 'react';
import { Box, Typography, Paper, Skeleton, useTheme, alpha } from '@mui/material';


const VB_W = 1200;  // wide 8:1 strip so it renders short at full container width
const VB_H = 150;
const PAD_L = 40;   // room for y-axis labels
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 26;   // room for x-axis labels

// 'YYYY-MM-DD' -> 'Jul 4'. Parsed as local parts (not new Date(str), which is
// UTC and can shift the day across a timezone boundary).
const shortDate = (ymd) => {
  const [y, m, d] = String(ymd).split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

export default function PlaysOverTimeChart({ data, loading }) {
  const theme = useTheme();
  const brand = theme.palette.primary.main;
  const [hover, setHover] = useState(null); // index of hovered point

  if (loading) {
    return <Skeleton variant="rounded" height={175} sx={{ borderRadius: 3 }} />;
  }

  const series = Array.isArray(data) ? data : [];
  const total = series.reduce((sum, p) => sum + (p.plays || 0), 0);

  if (!series.length || total === 0) {
    return (
      <Paper elevation={0}
        sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider',
          display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 150 }}>
        <Typography variant="body2" color="text.secondary">
          No plays recorded in this window yet.
        </Typography>
      </Paper>
    );
  }

  const plotW = VB_W - PAD_L - PAD_R;
  const plotH = VB_H - PAD_T - PAD_B;
  const maxPlays = Math.max(...series.map((p) => p.plays || 0), 1);

  // Even horizontal spacing; a single point sits at the left edge.
  const xAt = (i) => PAD_L + (series.length === 1 ? 0 : (plotW * i) / (series.length - 1));
  const yAt = (v) => PAD_T + plotH - (plotH * v) / maxPlays;

  const points = series.map((p, i) => ({ x: xAt(i), y: yAt(p.plays || 0), ...p, i }));
  const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  // Area = the line, then down to the baseline and back to the start.
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PAD_T + plotH} L ${points[0].x} ${PAD_T + plotH} Z`;

  // A few y gridlines/labels: 0, half, max (rounded).
  const yTicks = [0, Math.round(maxPlays / 2), maxPlays].filter((v, i, a) => a.indexOf(v) === i);

  // Label every other day so 14 labels don't collide.
  const labelEvery = series.length > 8 ? 2 : 1;

  return (
    <Paper elevation={0}
      sx={{ p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%"
          style={{ display: 'block' }} role="img"
          aria-label={`Daily plays over the last ${series.length} days`}
          onMouseLeave={() => setHover(null)}>
          {/* y gridlines + labels */}
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD_L} y1={yAt(v)} x2={VB_W - PAD_R} y2={yAt(v)}
                stroke={theme.palette.divider} strokeWidth="1" />
              <text x={PAD_L - 8} y={yAt(v) + 4} textAnchor="end"
                fontSize="10" fill={theme.palette.text.secondary}>{v}</text>
            </g>
          ))}

          {/* area + line */}
          <path d={areaPath} fill={alpha(brand, 0.12)} stroke="none" />
          <path d={linePath} fill="none" stroke={brand} strokeWidth="2"
            strokeLinejoin="round" strokeLinecap="round" />

          {/* x labels */}
          {points.map((pt) => (
            pt.i % labelEvery === 0 ? (
              <text key={pt.i} x={pt.x} y={VB_H - 8} textAnchor="middle"
                fontSize="10" fill={theme.palette.text.secondary}>{shortDate(pt.date)}</text>
            ) : null
          ))}

          {/* hover markers + hit areas */}
          {points.map((pt) => (
            <g key={pt.i}>
              {hover === pt.i && (
                <circle cx={pt.x} cy={pt.y} r="4" fill={brand}
                  stroke={theme.palette.background.paper} strokeWidth="2" />
              )}
              <rect x={pt.x - plotW / (series.length * 2)} y={PAD_T}
                width={plotW / series.length} height={plotH}
                fill="transparent" onMouseEnter={() => setHover(pt.i)} />
            </g>
          ))}
        </svg>

        {/* tooltip */}
        {hover != null && points[hover] && (
          <Box sx={{
            position: 'absolute', top: 0,
            left: `${(points[hover].x / VB_W) * 100}%`,
            transform: 'translateX(-50%)',
            bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider',
            borderRadius: 1, px: 1, py: 0.5, pointerEvents: 'none', whiteSpace: 'nowrap',
          }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {points[hover].plays}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {points[hover].plays === 1 ? 'play' : 'plays'} · {shortDate(points[hover].date)}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}