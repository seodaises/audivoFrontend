import { useState } from 'react';
import {
  Box, Stack, Typography, IconButton, Tooltip, Button, Dialog, Avatar, ButtonBase,
  useTheme, useMediaQuery,
} from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import PictureInPictureAltRoundedIcon from '@mui/icons-material/PictureInPictureAltRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import { useSelector, useDispatch } from 'react-redux';
import { closeFocused, openPip } from '../../store/slices/playerSlice';
import useSocialSong from '../../store/hooks/useSocial';
import useSongLyrics from '../../store/hooks/useSongLyrics';
import LyricsView from './LyricsView';
import { SeekRow, TransportControls, QueueList, usePlayerQueueControls } from './PlayerControls';

const artistLabel = (current) =>
  (typeof current?.artist === 'string'
    ? current.artist
    : current?.artist?.stageName) ?? 'Unknown artist';

function ViewTab({ label, active, onClick }) {
  return (
    <ButtonBase
      onClick={onClick}
      role="tab"
      aria-selected={active}
      sx={{
        px: 2, py: 1, borderRadius: 1,
        fontSize: '0.8125rem', fontWeight: 700, letterSpacing: 0.2,
        color: active ? 'primary.main' : 'text.secondary',
        borderBottom: '2px solid',
        borderColor: active ? 'primary.main' : 'transparent',
        transition: 'color .15s ease, border-color .15s ease',
      }}
    >
      {label}
    </ButtonBase>
  );
}

export default function FocusedPlayer() {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const { current, isPlaying, progress, duration, repeat, shuffle, focused } =
    useSelector((s) => s.player);
  const { queue, index, sensors, hasNext, onDragEnd, playItem, removeItem, clear } =
    usePlayerQueueControls();
  const { liked, busy: likeBusy, toggleLike } = useSocialSong(current?.id);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);

  const lyrics = useSongLyrics(current?.id);

  const open = Boolean(focused && current);

  const handleNowPlayingTab = () => {
    setLyricsOpen(false);
    setQueueOpen(false);
  };
  const handleLyricsTab = () => {
    if (isDesktop) {
      setLyricsOpen((o) => !o);
    } else {
      setLyricsOpen(true);
      setQueueOpen(false);
    }
  };
  const handleQueueTab = () => {
    if (isDesktop) {
      setQueueOpen((o) => !o);
    } else {
      setQueueOpen(true);
      setLyricsOpen(false);
    }
  };

  const lyricsPanel = (
    <LyricsView
      loading={lyrics.loading}
      available={lyrics.available}
      lines={lyrics.lines}
      error={lyrics.error}
      progress={progress}
    />
  );

  const queuePanel = (
    <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Up next</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
          </Typography>
          <Button size="small" onClick={clear} disabled={queue.length <= 1}>Clear</Button>
        </Stack>
      </Stack>
      <QueueList
        queue={queue} index={index} sensors={sensors}
        onDragEnd={onDragEnd} onPlayItem={playItem} onRemoveItem={removeItem}
      />
    </Box>
  );

  // Cover art shrinks as side columns open on desktop, so it isn't fighting
  // one (or two) panels for width.
  const openPanelCount = (lyricsOpen ? 1 : 0) + (queueOpen ? 1 : 0);
  const artMaxSize = !isDesktop || openPanelCount === 0 ? 420 : openPanelCount === 1 ? 340 : 260;

  const playerPanel = (
    <>
      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <Avatar
          variant="rounded"
          src={current?.coverUrl || undefined}
          sx={{
            bgcolor: 'primary.main', color: 'primary.contrastText',
            width: '100%', height: '100%',
            maxWidth: artMaxSize, maxHeight: artMaxSize,
            aspectRatio: '1 / 1', borderRadius: 3, boxShadow: 6,
            transition: 'max-width .2s ease, max-height .2s ease',
          }}
        >
          <MusicNoteRoundedIcon sx={{ fontSize: 96 }} />
        </Avatar>
      </Box>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 3, mb: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>{current?.title}</Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {artistLabel(current)}
          </Typography>
        </Box>
        <Tooltip title={liked ? 'Unlike' : 'Like'}>
          <IconButton
            onClick={() => toggleLike()}
            disabled={likeBusy}
            aria-label={liked ? 'Unlike current track' : 'Like current track'}
            aria-pressed={liked}
            sx={{ color: liked ? 'error.main' : 'text.secondary', flexShrink: 0 }}
          >
            {liked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
          </IconButton>
        </Tooltip>
      </Stack>
    </>
  );

  const transportRow = (
    <>
      <Stack direction="row" sx={{ alignItems: 'center', width: '100%', mb: 2 }}>
        <SeekRow dispatch={dispatch} progress={progress} duration={duration} />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <TransportControls
          dispatch={dispatch} isPlaying={isPlaying} shuffle={shuffle} repeat={repeat}
          hasNext={hasNext} size="medium" playSize="large"
        />
      </Stack>
    </>
  );
  const desktopMaxWidth = 720 + openPanelCount * 380;

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={() => dispatch(closeFocused())}
      TransitionProps={{ onExited: handleNowPlayingTab }}
    >
      {current && (
        <Box
          sx={{
            display: 'flex', flexDirection: 'column', height: '100%', p: 3,
            maxWidth: { xs: 720, md: isDesktop ? desktopMaxWidth : 720 },
            mx: 'auto', width: '100%',
            transition: 'max-width .2s ease',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <IconButton onClick={() => dispatch(closeFocused())} aria-label="Minimize player">
              <KeyboardArrowDownRoundedIcon />
            </IconButton>

            <Stack direction="row" spacing={1} role="tablist" aria-label="Focused player view" sx={{ alignItems: 'center' }}>
              <ViewTab label="Now Playing" active={!lyricsOpen && !queueOpen} onClick={handleNowPlayingTab} />
              <ViewTab label="Lyrics" active={lyricsOpen} onClick={handleLyricsTab} />
              <ViewTab label={queue.length ? `Queue (${queue.length})` : 'Queue'} active={queueOpen} onClick={handleQueueTab} />
            </Stack>

            <Tooltip title="Pop out">
              <IconButton onClick={() => dispatch(openPip())} aria-label="Pop out to mini player">
                <PictureInPictureAltRoundedIcon />
              </IconButton>
            </Tooltip>
          </Stack>

          {isDesktop ? (
            <Box sx={{ display: 'flex', flexGrow: 1, minHeight: 0, gap: 3 }}>
              {lyricsOpen && (
                <Box sx={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                  {lyricsPanel}
                </Box>
              )}

              <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                {playerPanel}
                {transportRow}
              </Box>

              {queueOpen && (
                <Box
                  sx={{
                    width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column',
                    borderLeft: '1px solid', borderColor: 'divider', pl: 3, overflowY: 'auto',
                  }}
                >
                  {queuePanel}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minHeight: 0 }}>
              {queueOpen ? queuePanel : lyricsOpen ? lyricsPanel : playerPanel}
              {transportRow}
            </Box>
          )}
        </Box>
      )}
    </Dialog>
  );
}