import {
  Box, Stack, Typography, IconButton, Avatar, Tooltip, Slider,
} from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import SkipPreviousRoundedIcon from '@mui/icons-material/SkipPreviousRounded';
import { fmt, QueueList } from './PlayerControls';

const stop = (e) => e.stopPropagation();

// Overlay buttons sit directly on the album art, whose color is unknown
// (cover images vary, and the amber fallback shifts between light/dark
// theme) — a fixed translucent dark chip keeps them legible regardless.
const overlayIconSx = {
  bgcolor: 'rgba(0,0,0,0.4)',
  color: '#fff',
  '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' },
};

// The 'full' tier — plain design C: a banner-height art image with the
// window controls overlaid on top of it, title/artist below, a bare
// progress bar (no time labels), then a flat prev/play/next row.
function FullBanner({
  current, isPlaying, progress, duration, hasNext, artistLabel,
  onPrev, onToggle, onNext, onSeek,
  showPopOut, onPopOut, onExpand, onClose, onHeaderPointerDown, floating,
  showQueue, onToggleQueue,
}) {
  return (
    <>
      <Box
        onPointerDown={floating ? undefined : onHeaderPointerDown}
        aria-label={floating ? undefined : 'Drag to move mini player'}
        sx={{
          position: 'relative',
          height: 100,
          flexShrink: 0,
          cursor: floating ? 'default' : 'move',
          touchAction: 'none',
          bgcolor: 'primary.main',
          backgroundImage: current.coverUrl ? `url(${current.coverUrl})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 6, right: 6 }}>
          <Tooltip title={showQueue ? 'Hide queue' : 'Show queue'}>
            <IconButton
              size="small" onPointerDown={stop} onClick={onToggleQueue}
              aria-label={showQueue ? 'Hide queue' : 'Show queue'} aria-pressed={showQueue}
              sx={{ ...overlayIconSx, ...(showQueue && { bgcolor: 'primary.main' }) }}
            >
              <QueueMusicRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {showPopOut && (
            <Tooltip title="Pop out to floating window">
              <IconButton size="small" onPointerDown={stop} onClick={onPopOut} aria-label="Pop out to floating window" sx={overlayIconSx}>
                <OpenInNewRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Expand">
            <IconButton size="small" onPointerDown={stop} onClick={onExpand} aria-label="Expand to focused player" sx={overlayIconSx}>
              <OpenInFullRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Close">
            <IconButton size="small" onPointerDown={stop} onClick={onClose} aria-label="Close mini player" sx={overlayIconSx}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ px: 1.75, pt: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700, fontSize: 15 }}>{current.title}</Typography>
        <Typography variant="caption" color="text.secondary" noWrap>{artistLabel}</Typography>
      </Box>

      <Box sx={{ px: 1.75, pt: 0.5 }}>
        <Slider
          size="small"
          value={Math.min(progress, duration || 0)}
          max={duration || 0}
          onChange={(_, v) => onSeek(v)}
          disabled={!duration}
          aria-label="Seek"
        />
      </Box>

      <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', justifyContent: 'center', py: 0.5 }}>
        <IconButton size="small" onClick={onPrev} aria-label="Previous track">
          <SkipPreviousRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton onClick={onToggle} aria-label={isPlaying ? 'Pause' : 'Play'} sx={{ color: 'primary.main' }}>
          {isPlaying ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
        </IconButton>
        <IconButton size="small" onClick={onNext} aria-label="Next track" disabled={!hasNext}>
          <SkipNextRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>
    </>
  );
}

// The 'comfortable' tier — small art beside the title, transport row, seek
// row with time labels.
function CardBody({ current, isPlaying, progress, duration, hasNext, artistLabel, onPrev, onToggle, onNext, onSeek }) {
  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5, px: 1.5, pb: 1, alignItems: 'center' }}>
        <Avatar
          variant="rounded"
          src={current.coverUrl || undefined}
          sx={{ width: 52, height: 52, bgcolor: 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}
        >
          <MusicNoteRoundedIcon />
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>{current.title}</Typography>
          <Typography variant="caption" color="text.secondary" noWrap>{artistLabel}</Typography>
        </Box>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center', py: 0.5 }}>
        <IconButton size="small" onClick={onPrev} aria-label="Previous track">
          <SkipPreviousRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={onToggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          {isPlaying ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={onNext} aria-label="Next track" disabled={!hasNext}>
          <SkipNextRoundedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ px: 1.5, pb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, width: 32, textAlign: 'right' }}>
          {fmt(progress)}
        </Typography>
        <Slider
          size="small"
          value={Math.min(progress, duration || 0)}
          max={duration || 0}
          onChange={(_, v) => onSeek(v)}
          disabled={!duration}
          aria-label="Seek"
          sx={{ flexGrow: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, width: 32 }}>
          {fmt(duration)}
        </Typography>
      </Box>
    </>
  );
}

// The smallest tier: one row, no prev/next, no artist line, no time labels.
function CompactBody({ current, isPlaying, progress, duration, onToggle }) {
  const pct = duration ? Math.min(100, (progress / duration) * 100) : 0;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, pb: 1.5, pt: 0.5 }}>
      <Avatar
        variant="rounded"
        src={current.coverUrl || undefined}
        sx={{ width: 40, height: 40, bgcolor: 'primary.main', color: 'primary.contrastText', flexShrink: 0 }}
      >
        <MusicNoteRoundedIcon fontSize="small" />
      </Avatar>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 700, fontSize: 13 }}>{current.title}</Typography>
        <Box sx={{ height: 3, bgcolor: 'action.hover', borderRadius: 1, mt: 0.75, overflow: 'hidden' }}>
          <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: 'primary.main' }} />
        </Box>
      </Box>
      <IconButton
        size="small"
        onClick={onToggle}
        aria-label={isPlaying ? 'Pause' : 'Play'}
        sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', '&:hover': { bgcolor: 'primary.dark' }, flexShrink: 0 }}
      >
        {isPlaying ? <PauseRoundedIcon fontSize="small" /> : <PlayArrowRoundedIcon fontSize="small" />}
      </IconButton>
    </Box>
  );
}

// The plain top-icon row used by the compact/comfortable tiers (full has its
// own overlay-on-art header instead — see FullBanner). Queue toggle is
// omitted in 'compact' by the parent (see below) — there's no room for a
// fourth icon at that width, and compact is meant to stay minimal.
function TopIconRow({
  floating, onHeaderPointerDown, showPopOut, onPopOut, onExpand, onClose,
  showQueueToggle, showQueue, onToggleQueue,
}) {
  return (
    <Box
      onPointerDown={floating ? undefined : onHeaderPointerDown}
      aria-label={floating ? undefined : 'Drag to move mini player'}
      sx={{
        cursor: floating ? 'default' : 'move',
        touchAction: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5,
        px: 1, py: 0.5, flexShrink: 0,
      }}
    >
      {showQueueToggle && (
        <Tooltip title={showQueue ? 'Hide queue' : 'Show queue'}>
          <IconButton
            size="small" onPointerDown={stop} onClick={onToggleQueue}
            aria-label={showQueue ? 'Hide queue' : 'Show queue'} aria-pressed={showQueue}
            sx={{ color: showQueue ? 'primary.main' : 'text.secondary' }}
          >
            <QueueMusicRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      {showPopOut && (
        <Tooltip title="Pop out to floating window">
          <IconButton size="small" onPointerDown={stop} onClick={onPopOut} aria-label="Pop out to floating window">
            <OpenInNewRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Expand">
        <IconButton size="small" onPointerDown={stop} onClick={onExpand} aria-label="Expand to focused player">
          <OpenInFullRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Close">
        <IconButton size="small" onPointerDown={stop} onClick={onClose} aria-label="Close mini player">
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default function PipPlayerContent({
  current, isPlaying, progress, duration, hasNext, artistLabel,
  onPrev, onToggle, onNext, onSeek, onExpand, onClose,
  variant = 'card', density = 'full', showPopOut = false, onPopOut, onHeaderPointerDown,
  queue = [], queueIndex = -1, sensors, onQueueDragEnd, onPlayQueueItem, onRemoveQueueItem,
  showQueue = false, onToggleQueue,
}) {
  const floating = variant === 'floating';

  return (
    <>
      {density === 'full' ? (
        <FullBanner
          current={current} isPlaying={isPlaying} progress={progress} duration={duration}
          hasNext={hasNext} artistLabel={artistLabel}
          onPrev={onPrev} onToggle={onToggle} onNext={onNext} onSeek={onSeek}
          showPopOut={showPopOut} onPopOut={onPopOut} onExpand={onExpand} onClose={onClose}
          onHeaderPointerDown={onHeaderPointerDown} floating={floating}
          showQueue={showQueue} onToggleQueue={onToggleQueue}
        />
      ) : (
        <>
          <TopIconRow
            floating={floating} onHeaderPointerDown={onHeaderPointerDown}
            showPopOut={showPopOut} onPopOut={onPopOut} onExpand={onExpand} onClose={onClose}
            showQueueToggle={density === 'comfortable'}
            showQueue={showQueue} onToggleQueue={onToggleQueue}
          />
          {density === 'compact' ? (
            <CompactBody current={current} isPlaying={isPlaying} progress={progress} duration={duration} onToggle={onToggle} />
          ) : (
            <CardBody
              current={current} isPlaying={isPlaying} progress={progress} duration={duration}
              hasNext={hasNext} artistLabel={artistLabel}
              onPrev={onPrev} onToggle={onToggle} onNext={onNext} onSeek={onSeek}
            />
          )}
        </>
      )}

      {showQueue && (
        <Box sx={{ flexGrow: 1, minHeight: 0, overflowY: 'auto', px: 1, pb: 1 }}>
          <QueueList
            queue={queue} index={queueIndex} sensors={sensors}
            onDragEnd={onQueueDragEnd} onPlayItem={onPlayQueueItem} onRemoveItem={onRemoveQueueItem}
          />
        </Box>
      )}
    </>
  );
}