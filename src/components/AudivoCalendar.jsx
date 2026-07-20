import { useState, useMemo } from 'react';
import { Box, Typography, IconButton, Stack, alpha } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// How far the year list reaches when the caller gives no bound on that side.
// Ten years covers "schedule a release" and "pick a release date in the past"
// without producing a scroll list nobody wants to drag through.
const YEAR_SPAN = 80;

const sameDay = (a, b) =>
  a && b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export default function AudivoCalendar({ value = null, onChange, minDate = null, maxDate = null }) {
  const today = new Date();
  const initial = value || today;
  const [viewY, setViewY] = useState(initial.getFullYear());
  const [viewM, setViewM] = useState(initial.getMonth());

  // null = day grid (default), 'month' | 'year' = picker overlay.
  // One state rather than two booleans, so the two panels can't both be open.
  const [picker, setPicker] = useState(null);

  const minStartRaw = minDate ? startOfDay(minDate) : null;
  const maxStartRaw = maxDate ? startOfDay(maxDate) : null;

  // Year list, clamped to whatever bounds the caller gave. ArtistStudio passes
  // minDate=today for scheduling, so offering 2015 there would be a dead option.
  const years = useMemo(() => {
    const anchor = initial.getFullYear();
    const lo = minStartRaw ? minStartRaw.getFullYear() : anchor - YEAR_SPAN;
    const hi = maxStartRaw ? maxStartRaw.getFullYear() : anchor + YEAR_SPAN;
    const out = [];
    for (let y = lo; y <= hi; y += 1) out.push(y);
    return out;
  }, [minStartRaw, maxStartRaw, initial]);

  // A whole month is unreachable when even its LAST day falls before minDate,
  // or its FIRST day falls after maxDate. Computing this once here keeps the
  // month grid, the year grid and the arrows all agreeing.
  const monthDisabled = (y, m) => {
    const lastOfMonth = new Date(y, m + 1, 0);
    const firstOfMonth = new Date(y, m, 1);
    if (minStartRaw && lastOfMonth < minStartRaw) return true;
    if (maxStartRaw && firstOfMonth > maxStartRaw) return true;
    return false;
  };

  const yearDisabled = (y) => {
    if (minStartRaw && y < minStartRaw.getFullYear()) return true;
    if (maxStartRaw && y > maxStartRaw.getFullYear()) return true;
    return false;
  };

  // Arrows respect the same bounds — previously they'd happily walk into a
  // month where every single day renders disabled, which looks broken.
  const prevTarget = viewM === 0 ? { y: viewY - 1, m: 11 } : { y: viewY, m: viewM - 1 };
  const nextTarget = viewM === 11 ? { y: viewY + 1, m: 0 } : { y: viewY, m: viewM + 1 };
  const canPrev = !monthDisabled(prevTarget.y, prevTarget.m);
  const canNext = !monthDisabled(nextTarget.y, nextTarget.m);

  const prevMonth = () => {
    if (!canPrev) return;
    setViewY(prevTarget.y);
    setViewM(prevTarget.m);
  };
  const nextMonth = () => {
    if (!canNext) return;
    setViewY(nextTarget.y);
    setViewM(nextTarget.m);
  };

  const firstDay = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const minStart = minStartRaw;
  const maxStart = maxStartRaw;

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(viewY, viewM, d));

  return (
    <Box>
      <Stack direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        {/* The label IS the picker trigger. Clicking the month opens the month
            grid, clicking the year opens the year grid — so you land on the
            panel you actually meant, rather than one generic menu. */}
        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
          <Box
            component="button"
            type="button"
            onClick={() => setPicker((p) => (p === 'month' ? null : 'month'))}
            aria-label="Choose month"
            aria-expanded={picker === 'month'}
            sx={(t) => ({
              border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
              color: picker === 'month' ? 'primary.main' : 'text.primary',
              px: 0.5, py: 0.25, borderRadius: 1.5,
              '&:hover': { bgcolor: alpha(t.palette.primary.main, 0.12) },
            })}
          >
            {MONTHS[viewM]}
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => setPicker((p) => (p === 'year' ? null : 'year'))}
            aria-label="Choose year"
            aria-expanded={picker === 'year'}
            sx={(t) => ({
              border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
              color: picker === 'year' ? 'primary.main' : 'text.primary',
              px: 0.5, py: 0.25, borderRadius: 1.5,
              display: 'flex', alignItems: 'center', gap: 0.25,
              '&:hover': { bgcolor: alpha(t.palette.primary.main, 0.12) },
            })}
          >
            {viewY}
            <ExpandMoreRoundedIcon
              sx={{
                fontSize: 16,
                transition: 'transform .18s ease',
                transform: picker ? 'rotate(180deg)' : 'none',
              }}
            />
          </Box>
        </Stack>

        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" onClick={prevMonth} disabled={!canPrev}
            aria-label="Previous month"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <ChevronLeftRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={nextMonth} disabled={!canNext}
            aria-label="Next month"
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <ChevronRightRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Stack>

      {/* ── MONTH PICKER ─────────────────────────────────────────────── */}
      {picker === 'month' && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.75 }}>
          {MONTHS_SHORT.map((label, m) => {
            const disabled = monthDisabled(viewY, m);
            const isCurrent = m === viewM;
            return (
              <Box
                key={label}
                component="button"
                type="button"
                disabled={disabled}
                onClick={() => { setViewM(m); setPicker(null); }}
                sx={(t) => ({
                  border: 'none', borderRadius: 2, py: 1.25,
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontSize: 13,
                  fontWeight: isCurrent ? 800 : 500,
                  bgcolor: isCurrent ? 'primary.main' : 'transparent',
                  color: isCurrent
                    ? 'primary.contrastText'
                    : disabled ? 'text.disabled' : 'text.primary',
                  opacity: disabled ? 0.5 : 1,
                  transition: 'background-color .15s ease',
                  '&:hover': !disabled && !isCurrent
                    ? { bgcolor: alpha(t.palette.primary.main, 0.12) }
                    : undefined,
                })}
              >
                {label}
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── YEAR PICKER ──────────────────────────────────────────────── */}
      {picker === 'year' && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0.75,
            // Bounded height so a wide min/max range scrolls instead of
            // stretching the popover past the viewport.
            maxHeight: 210,
            overflowY: 'auto',
          }}
        >
          {years.map((y) => {
            const disabled = yearDisabled(y);
            const isCurrent = y === viewY;
            return (
              <Box
                key={y}
                component="button"
                type="button"
                disabled={disabled}
                onClick={() => {
                  setViewY(y);
                  // Landing on a year whose current month is out of bounds would
                  // show an all-disabled grid, so snap to the first legal month.
                  if (monthDisabled(y, viewM)) {
                    const legal = MONTHS.findIndex((_, m) => !monthDisabled(y, m));
                    if (legal !== -1) setViewM(legal);
                  }
                  setPicker(null);
                }}
                sx={(t) => ({
                  border: 'none', borderRadius: 2, py: 1.25,
                  cursor: disabled ? 'default' : 'pointer',
                  fontFamily: 'inherit', fontSize: 13,
                  fontWeight: isCurrent ? 800 : 500,
                  bgcolor: isCurrent ? 'primary.main' : 'transparent',
                  color: isCurrent
                    ? 'primary.contrastText'
                    : disabled ? 'text.disabled' : 'text.primary',
                  opacity: disabled ? 0.5 : 1,
                  transition: 'background-color .15s ease',
                  '&:hover': !disabled && !isCurrent
                    ? { bgcolor: alpha(t.palette.primary.main, 0.12) }
                    : undefined,
                })}
              >
                {y}
              </Box>
            );
          })}
        </Box>
      )}

      {/* Day grid hides while a picker is open — showing both at once makes the
          popover jump in height and buries the grid you're trying to use. */}
      {picker === null && (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
        {DOW.map((d) => (
          <Typography key={d} align="center"
            sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 0.5 }}>
            {d}
          </Typography>
        ))}

        {cells.map((date, i) => {
          if (!date) return <Box key={`e${i}`} />;
          const isToday = sameDay(date, today);
          const isSel = sameDay(date, value);
          const disabled =
            (minStart && startOfDay(date) < minStart) ||
            (maxStart && startOfDay(date) > maxStart);

          return (
            <Box
              key={date.toISOString()}
              component="button"
              type="button"
              disabled={disabled}
              onClick={() => onChange && onChange(date)}
              sx={(t) => ({
                aspectRatio: '1 / 1',
                border: 'none',
                borderRadius: 2,
                cursor: disabled ? 'default' : 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                position: 'relative',
                display: 'grid',
                placeItems: 'center',
                bgcolor: isSel ? 'primary.main' : 'transparent',
                color: isSel
                  ? 'primary.contrastText'
                  : disabled
                    ? 'text.disabled'
                    : isToday
                      ? 'primary.main'
                      : 'text.primary',
                fontWeight: isSel || isToday ? 800 : 400,
                opacity: disabled ? 0.5 : 1,
                transition: 'background-color .15s ease',
                '&:hover': !disabled && !isSel
                  ? { bgcolor: alpha(t.palette.primary.main, 0.12) }
                  : undefined,
                '&::after': isToday ? {
                  content: '""',
                  position: 'absolute',
                  bottom: 5,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  bgcolor: isSel ? 'primary.contrastText' : 'primary.main',
                } : undefined,
              })}
            >
              {date.getDate()}
            </Box>
          );
        })}
      </Box>
      )}
    </Box>
  );
}