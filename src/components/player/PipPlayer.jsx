import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Paper, useTheme, useMediaQuery } from '@mui/material';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import { useSelector, useDispatch } from 'react-redux';
import {
  togglePlay, next, prev, requestSeek, closePip, openFocused,
} from '../../store/slices/playerSlice';
import { useSidebar } from '../../store/hooks/useSidebar';
import {
  SIDEBAR_RAIL_WIDTH, SIDEBAR_FULL_WIDTH, PLAYBAR_HEIGHT, HEADER_HEIGHT,
} from '../../constants/layout';
import { copyStylesToWindow, watchForNewStyles } from './documentPip';
import { usePlayerQueueControls } from './PlayerControls';
import PipPlayerContent from './PipPlayerContent';

const BASE_MIN_W = 200;
const BASE_MIN_H = 96;
const MAX_W = 460;
const MAX_H = 300;
const MARGIN = 16;
const DENSITY_BUFFER = 16; // px of hysteresis before a density tier switches

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function computeBounds(w, h, isDesktop, drawerWidth) {
  const minLeft = isDesktop ? drawerWidth + MARGIN : MARGIN;
  const minTop = HEADER_HEIGHT + MARGIN;
  return {
    minLeft,
    minTop,
    maxLeft: Math.max(minLeft, window.innerWidth - w - MARGIN),
    maxTop: Math.max(minTop, window.innerHeight - h - PLAYBAR_HEIGHT - MARGIN),
  };
}

const minW = () => Math.min(BASE_MIN_W, Math.max(160, window.innerWidth - 2 * MARGIN));
const minH = () => Math.min(BASE_MIN_H, Math.max(96, window.innerHeight - HEADER_HEIGHT - PLAYBAR_HEIGHT - 2 * MARGIN));

function getDensity(w, h, prevDensity) {
  const meetsFull = (buf = 0) => w >= 300 + buf && h >= 210 + buf;
  const meetsComfortable = (buf = 0) => w >= 260 + buf && h >= 130 + buf;

  if (!prevDensity) {
    if (meetsFull()) return 'full';
    if (meetsComfortable()) return 'comfortable';
    return 'compact';
  }

  // Hysteresis: moving UP a tier requires clearing the threshold by
  // DENSITY_BUFFER; moving DOWN requires dropping below it by the same
  // buffer. Without this, sitting right on a breakpoint during a drag-resize
  // flips the whole layout back and forth on every pixel of movement — three
  // structurally different components (banner / card / compact row), so each
  // flip is a visible jump, not a subtle nudge.
  if (prevDensity === 'full') {
    if (meetsFull(-DENSITY_BUFFER)) return 'full';
    return meetsComfortable() ? 'comfortable' : 'compact';
  }
  if (prevDensity === 'comfortable') {
    if (meetsFull(DENSITY_BUFFER)) return 'full';
    return meetsComfortable(-DENSITY_BUFFER) ? 'comfortable' : 'compact';
  }
  // prevDensity === 'compact'
  if (meetsComfortable(DENSITY_BUFFER)) return meetsFull() ? 'full' : 'comfortable';
  return 'compact';
}

const supportsDocumentPip =
  typeof window !== 'undefined' && 'documentPictureInPicture' in window;

export default function PipPlayer() {
  const dispatch = useDispatch();
  const { current, isPlaying, progress, duration, pip, order, orderPos, repeat } =
    useSelector((s) => s.player);
  const { sidebarHidden } = useSidebar();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const drawerWidth = sidebarHidden ? SIDEBAR_RAIL_WIDTH : SIDEBAR_FULL_WIDTH;

  const {
    queue, index: queueIndex, sensors,
    onDragEnd: onQueueDragEnd, playItem: onPlayQueueItem, removeItem: onRemoveQueueItem,
  } = usePlayerQueueControls();
  const [showQueue, setShowQueue] = useState(false);

  const hasNext = orderPos >= 0 && (repeat === 'all' || orderPos < order.length - 1);
  const artistLabel =
    (typeof current?.artist === 'string' ? current.artist : current?.artist?.stageName) ??
    'Unknown artist';

  const [size, setSize] = useState({ w: 320, h: 240 });
  const [pos, setPos] = useState(null); // {left, top}; null until first placed
  const session = useRef(null);         // active drag/resize session, or null

  const [pipWindow, setPipWindow] = useState(null);
  const [floatingSize, setFloatingSize] = useState({ w: 320, h: 240 });
  const stopWatchingStylesRef = useRef(null);
  const densityRef = useRef('full'); // last chosen density tier — hysteresis anchor

  const layoutRef = useRef({ isDesktop, drawerWidth });
  useEffect(() => {
    layoutRef.current = { isDesktop, drawerWidth };
  }, [isDesktop, drawerWidth]);

  const sizeRef = useRef(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  // First placement: bottom-right corner, clear of the sidebar/header/playbar.
  useEffect(() => {
    if (!pip) return;
    setPos((prev) => {
      if (prev) return prev;
      const w = clamp(sizeRef.current.w, minW(), MAX_W);
      const h = clamp(sizeRef.current.h, minH(), MAX_H);
      const b = computeBounds(w, h, layoutRef.current.isDesktop, layoutRef.current.drawerWidth);
      return { left: b.maxLeft, top: b.maxTop };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pip]);

  useEffect(() => {
    const reclamp = () => {
      const w = clamp(sizeRef.current.w, minW(), MAX_W);
      const h = clamp(sizeRef.current.h, minH(), MAX_H);
      if (w !== sizeRef.current.w || h !== sizeRef.current.h) setSize({ w, h });

      const b = computeBounds(w, h, isDesktop, drawerWidth);
      setPos((p) => {
        if (!p) return p;
        const left = clamp(p.left, b.minLeft, b.maxLeft);
        const top = clamp(p.top, b.minTop, b.maxTop);
        return (left === p.left && top === p.top) ? p : { left, top };
      });
    };
    reclamp();
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, [isDesktop, drawerWidth]);

  const moveRef = useRef(null);
  const upRef = useRef(null);
  useEffect(() => {
    const onMove = (e) => {
      const s = session.current;
      if (!s) return;
      const { isDesktop: desk, drawerWidth: dw } = layoutRef.current;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;
      if (s.mode === 'drag') {
        const b = computeBounds(s.w, s.h, desk, dw);
        setPos({
          left: clamp(s.origLeft + dx, b.minLeft, b.maxLeft),
          top: clamp(s.origTop + dy, b.minTop, b.maxTop),
        });
      } else {
        setSize({
          w: clamp(s.origW + dx, minW(), Math.min(MAX_W, window.innerWidth - s.origLeft - MARGIN)),
          h: clamp(s.origH + dy, minH(), Math.min(MAX_H, window.innerHeight - s.origTop - PLAYBAR_HEIGHT - MARGIN)),
        });
      }
    };
    const onUp = () => {
      session.current = null;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
    moveRef.current = onMove;
    upRef.current = onUp;
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };
  }, []);

  const beginSession = (mode) => (e) => {
    if (e.button === 2 || !pos) return; // ignore right-click; need a placed card
    e.preventDefault();
    session.current =
      mode === 'drag'
        ? { mode, startX: e.clientX, startY: e.clientY, origLeft: pos.left, origTop: pos.top, w: size.w, h: size.h }
        : { mode, startX: e.clientX, startY: e.clientY, origW: size.w, origH: size.h, origLeft: pos.left, origTop: pos.top };
    document.addEventListener('pointermove', moveRef.current);
    document.addEventListener('pointerup', upRef.current);
  };

  // ── Document Picture-in-Picture ─────────────────────────────────────────
  const openDocumentPip = async () => {
    if (!supportsDocumentPip || pipWindow) return;
    try {
      const win = await window.documentPictureInPicture.requestWindow({
        width: Math.round(size.w),
        height: Math.round(size.h),
      });
      win.document.title = 'Audivo — Mini player';
      win.document.documentElement.style.colorScheme = theme.palette.mode;
      win.document.body.style.cssText =
        'margin:0;height:100vh;display:flex;flex-direction:column;overflow:hidden;' +
        `background:${theme.palette.background.paper};`;
      copyStylesToWindow(win);
      stopWatchingStylesRef.current = watchForNewStyles(win);

      setFloatingSize({ w: win.innerWidth, h: win.innerHeight });
      // Anchor hysteresis fresh, from the real starting size of the floating
      // window — not whatever tier the in-app card happened to be on.
      densityRef.current = getDensity(win.innerWidth, win.innerHeight);
      // Batch to one update per animation frame. The native 'resize' event on
      // a window being dragged can fire far faster than the screen repaints —
      // without this, floatingSize (and therefore density) can recompute
      // several times per frame, each one a potential tier flip.
      let rafId = null;
      const onFloatingResize = () => {
        if (rafId != null) return;
        rafId = win.requestAnimationFrame(() => {
          rafId = null;
          setFloatingSize({ w: win.innerWidth, h: win.innerHeight });
        });
      };
      win.addEventListener('resize', onFloatingResize);

      win.addEventListener('pagehide', () => {
        win.removeEventListener('resize', onFloatingResize);
        if (rafId != null) win.cancelAnimationFrame(rafId);
        stopWatchingStylesRef.current?.();
        stopWatchingStylesRef.current = null;
        setPipWindow(null);
      }, { once: true });

      setPipWindow(win);
    } catch {
      // The browser declined the request (permission dismissed, or called
      // outside a user-gesture context) — stay in the normal in-page card.
    }
  };

  useEffect(() => () => {
    stopWatchingStylesRef.current?.();
    pipWindow?.close();
  }, [pipWindow]);

  const handleClose = () => {
    pipWindow?.close();
    dispatch(closePip());
  };

  const handleExpand = () => {
    pipWindow?.close();
    dispatch(openFocused());
  };

  if (!current || !pip || !pos) return null;

  // Fed to getDensity as the prior tier so hysteresis has something to
  // compare against. Mutating a ref mid-render is safe here: it's purely
  // derived from state that already triggers this render (floatingSize/size),
  // so it doesn't need its own effect or extra render cycle.
  const activeW = pipWindow ? floatingSize.w : size.w;
  const activeH = pipWindow ? floatingSize.h : size.h;
  const density = getDensity(activeW, activeH, densityRef.current);
  densityRef.current = density;

  const content = (
    <PipPlayerContent
      current={current}
      isPlaying={isPlaying}
      progress={progress}
      duration={duration}
      hasNext={hasNext}
      artistLabel={artistLabel}
      onPrev={() => dispatch(prev())}
      onToggle={() => dispatch(togglePlay())}
      onNext={() => dispatch(next())}
      onSeek={(v) => dispatch(requestSeek(v))}
      onExpand={handleExpand}
      onClose={handleClose}
      variant={pipWindow ? 'floating' : 'card'}
      density={density}
      showPopOut={supportsDocumentPip && !pipWindow}
      onPopOut={openDocumentPip}
      onHeaderPointerDown={beginSession('drag')}
      queue={queue}
      queueIndex={queueIndex}
      sensors={sensors}
      onQueueDragEnd={onQueueDragEnd}
      onPlayQueueItem={onPlayQueueItem}
      onRemoveQueueItem={onRemoveQueueItem}
      showQueue={showQueue}
      onToggleQueue={() => setShowQueue((v) => !v)}
    />
  );

  if (pipWindow) {
    return createPortal(content, pipWindow.document.body);
  }

  return (
    <Paper
      elevation={12}
      sx={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: size.w,
        height: size.h,
        zIndex: (t) => t.zIndex.appBar + 2, // above the bottom bar
        borderRadius: 3,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: 1,
        borderColor: 'divider',
        backgroundImage: 'none',
      }}
    >
      {content}

      {/* Resize grip — bottom-right corner. */}
      <Box
        onPointerDown={beginSession('resize')}
        aria-label="Resize mini player"
        sx={{
          position: 'absolute', right: 0, bottom: 0, width: 20, height: 20,
          cursor: 'nwse-resize', touchAction: 'none',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
        }}
      >
        <OpenInFullRoundedIcon sx={{ fontSize: 12, transform: 'rotate(90deg)', color: 'text.disabled', mr: '2px', mb: '2px' }} />
      </Box>
    </Paper>
  );
}