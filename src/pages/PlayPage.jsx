import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box, Stack, Typography, Avatar, IconButton, Tooltip, Link, Divider,
  CircularProgress, Alert, Button,
} from '@mui/material';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import FavoriteBorderRoundedIcon from '@mui/icons-material/FavoriteBorderRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import PictureInPictureAltRoundedIcon from '@mui/icons-material/PictureInPictureAltRounded';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSong } from '../api/catalog';
import { playTrack, openFocused, togglePip } from '../store/slices/playerSlice';
import useSocialSong from '../store/hooks/useSocial';
import ShareButton from '../components/ShareButton';
import CommentSection from '../components/CommentSection';
import { SeekRow, TransportControls, usePlayerQueueControls } from '../components/player/playerControls';
import { PLAYBAR_HEIGHT, CONTENT_BOTTOM_GAP } from '../constants/layout';

export default function PlayPage() {
  const { publicId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [state, setState] = useState({ status: 'loading', song: null, error: null });
  const startedRef = useRef(null); // publicId we've already auto-played

  const [highlightCommentId, setHighlightCommentId] = useState(null);
  const handledKeyRef = useRef(null);
  useEffect(() => {
    if (handledKeyRef.current === location.key) return;
    const st = location.state;
    if (st && st.highlightCommentId != null) {
      handledKeyRef.current = location.key;
      setHighlightCommentId(st.highlightCommentId);
      // Clear the state so a refresh or back-nav doesn't re-highlight it.
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const { current, isPlaying, progress, duration, repeat, shuffle } =
    useSelector((s) => s.player);
  const { hasNext } = usePlayerQueueControls();
  const { liked, busy: likeBusy, toggleLike } = useSocialSong(state.song?.id);

  // Load the song whenever the public id in the URL changes.
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', song: null, error: null });
    fetchSong(publicId)
      .then((song) => {
        if (!cancelled) setState({ status: 'ready', song, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ status: 'error', song: null, error: err?.message || 'This song isn\u2019t available.' });
        }
      });
    return () => { cancelled = true; };
  }, [publicId]);

  useEffect(() => {
    const song = state.song;
    if (!song || startedRef.current === song.publicId) return;
    startedRef.current = song.publicId;
    const alreadyCurrent = current && String(current.id) === String(song.id);
    if (!alreadyCurrent) {
      dispatch(playTrack({
        id: song.id,
        title: song.title,
        artist: song.artist,
        coverUrl: song.coverUrl,
        source: 'share',
      }));
    }
  }, [state.song, current, dispatch]);

  const pageSx = {
    px: { xs: 2, sm: 4 },
    py: { xs: 3, sm: 5 },
    pb: `${PLAYBAR_HEIGHT + CONTENT_BOTTOM_GAP}px`,
    maxWidth: 640,
    mx: 'auto',
  };

  if (state.status === 'loading') {
    return (
      <Box sx={{ ...pageSx, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (state.status === 'error') {
    return (
      <Box sx={pageSx}>
        <Alert severity="info" sx={{ mb: 2 }}>{state.error}</Alert>
        <Button variant="outlined" onClick={() => navigate('/browse')}>Browse music</Button>
      </Box>
    );
  }

  const song = state.song;
  const artistName = song.artist?.stageName ?? 'Unknown artist';
  const albumRef = song.albumPublicId ?? song.album?.publicId ?? null;

  return (
    <Box sx={pageSx}>
      <Typography variant="overline" color="text.secondary">Now playing</Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
        <Avatar
          variant="rounded"
          src={song.coverUrl || undefined}
          sx={{
            bgcolor: 'primary.main', color: 'primary.contrastText',
            width: '100%', height: 'auto', maxWidth: 360, aspectRatio: '1 / 1',
            borderRadius: 3, boxShadow: 6,
          }}
        >
          <MusicNoteRoundedIcon sx={{ fontSize: 96 }} />
        </Avatar>
      </Box>

      <Stack direction="row" sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }} noWrap>{song.title}</Typography>
          <Typography variant="body1" color="text.secondary" noWrap>
            {song.artist?.username ? (
              <Link component={RouterLink} to={`/artist/${song.artist.username}`} underline="hover" color="inherit">
                {artistName}
              </Link>
            ) : artistName}
            {song.album && (
              <>
                {'  \u00B7  '}
                {albumRef ? (
                  <Link component={RouterLink} to={`/album/${albumRef}`} underline="hover" color="inherit">
                    {song.album.title}
                  </Link>
                ) : song.album.title}
              </>
            )}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Tooltip title={liked ? 'Unlike' : 'Like'}>
            <span>
              <IconButton
                onClick={() => toggleLike()}
                disabled={likeBusy}
                aria-label={liked ? 'Unlike this song' : 'Like this song'}
                aria-pressed={liked}
                sx={{ color: liked ? 'error.main' : 'text.secondary' }}
              >
                {liked ? <FavoriteRoundedIcon /> : <FavoriteBorderRoundedIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <ShareButton kind="song" songPublicId={song.publicId} title={song.title} artistName={artistName} size="medium" />
        </Stack>
      </Stack>

      <Stack direction="row" sx={{ alignItems: 'center', width: '100%', mt: 3, mb: 1 }}>
        <SeekRow dispatch={dispatch} progress={progress} duration={duration} />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <TransportControls
          dispatch={dispatch} isPlaying={isPlaying} shuffle={shuffle} repeat={repeat}
          hasNext={hasNext} size="medium" playSize="large"
        />
      </Stack>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'center' }}>
        <Tooltip title="Focus mode">
          <IconButton onClick={() => dispatch(openFocused())} aria-label="Open focused player">
            <OpenInFullRoundedIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Mini player">
          <IconButton onClick={() => dispatch(togglePip())} aria-label="Toggle mini player">
            <PictureInPictureAltRoundedIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <Divider sx={{ my: 4 }} />

      <CommentSection
        songId={song.id}
        isSongOwner={song.isOwner}
        highlightCommentId={highlightCommentId}
      />
    </Box>
  );
}