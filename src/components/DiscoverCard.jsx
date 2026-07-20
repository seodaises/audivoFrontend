import { Box, Stack, Typography, Skeleton, alpha } from '@mui/material';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

const EMPHASIS = {
  1: { accentOpacity: 1,    stripe: 4, tint: 0.14 },
  2: { accentOpacity: 0.75, stripe: 3, tint: 0.10 },
  3: { accentOpacity: 0.55, stripe: 2, tint: 0.07 },
};

export default function DiscoverCard({
  label,          // small uppercase eyebrow, e.g. "ON REPEAT"
  caption,        // one-line explanation under the label
  emphasis = 1,   // 1 = strongest amber, 3 = most muted
  icon = null,
  loading = false,
  empty = false,
  emptyText = 'Nothing here yet.',
  onClick = null, // makes the WHOLE card a target
  actionLabel = null, // e.g. "Open album" — shown bottom-right on hover
  children,
}) {
  const cfg = EMPHASIS[emphasis] ?? EMPHASIS[1];
  const clickable = Boolean(onClick);
  const accentOf = (t) => alpha(t.palette.primary.main, cfg.accentOpacity);

  return (
    <Box
      onClick={onClick || undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      sx={{
        position: 'relative',
        flex: '1 1 260px',
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        overflow: 'hidden',
        p: 2,
        pt: 2.5,
        pb: clickable && actionLabel ? 4.5 : 2,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color .18s ease, background-color .18s ease, transform .18s ease',
        ...(clickable && {
          '&:hover': {
            borderColor: (t) => accentOf(t),
            bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
            transform: 'translateY(-2px)',
          },
          '&:hover .discover-action': { opacity: 1 },
          '&:focus-visible': {
            outline: (t) => `2px solid ${accentOf(t)}`,
            outlineOffset: 2,
          },
        }),
      }}
    >
    
      <Box
        sx={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: cfg.stripe,
          bgcolor: (t) => accentOf(t),
        }}
      />

      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'flex-start', mb: 2 }}>
        {icon && (
          <Box
            sx={{
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              color: (t) => accentOf(t),
              bgcolor: (t) => alpha(t.palette.primary.main, cfg.tint),
            }}
          >
            {icon}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              fontWeight: 800,
              letterSpacing: 0.8,
              color: (t) => accentOf(t),
            }}
          >
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {caption}
          </Typography>
        </Box>
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          <Skeleton variant="rounded" height={52} />
          <Skeleton variant="text" width="70%" />
          <Skeleton variant="text" width="50%" />
        </Stack>
      ) : empty ? (
        <Typography variant="body2" color="text.disabled" sx={{ py: 2 }}>
          {emptyText}
        </Typography>
      ) : (
        children
      )}

      {clickable && actionLabel && !loading && !empty && (
        <Stack
          className="discover-action"
          direction="row"
          spacing={0.25}
          sx={{
            position: 'absolute',
            right: 16,
            bottom: 12,
            alignItems: 'center',
            opacity: 0,
            transition: 'opacity .18s ease',
            color: (t) => accentOf(t),
            pointerEvents: 'none', // the whole card is the target; this is a label
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700 }}>
            {actionLabel}
          </Typography>
          <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
        </Stack>
      )}
    </Box>
  );
}