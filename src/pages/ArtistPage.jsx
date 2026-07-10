import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Avatar, Divider,
  List, ListItemButton, ListItemAvatar, ListItemText, IconButton,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { useSelector, useDispatch } from 'react-redux';
import MediaCard from '../components/MediaCard';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import { fetchArtistByUsername } from '../api/catalog';

const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function ArtistPage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      setData(await fetchArtistByUsername(username));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  const profile = data?.profile;
  const artistRef = profile ? { id: profile.id, stageName: profile.stageName } : null;

  // The artist's published songs are the queue.
  const tracks = (data?.songs || []).map((s) => ({
    id: s.id, title: s.title,
    artist: artistRef,
    coverUrl: s.coverUrl ?? null,
  }));

  const onPlaySong = (idx) => {
    const track = tracks[idx];
    if (loadedId === track.id) dispatch(togglePlay());
    else dispatch(playFromQueue({ queue: tracks, index: idx }));
  };

  if (loading) {
    return (
      <Box sx={{ pb: 12 }}>
        <Stack direction="row" spacing={3} sx={{ alignItems: 'center', mb: 3 }}>
          <Skeleton variant="circular" width={120} height={120} />
          <Box><Skeleton width={200} height={40} /><Skeleton width={120} /></Box>
        </Stack>
      </Box>
    );
  }

  if (err) {
    return (
      <Box sx={{ pb: 12 }}>
        <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mb: 2 }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Alert severity="error">{err}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 12 }}>
      <IconButton onClick={() => navigate(-1)} aria-label="Back" sx={{ mb: 2 }}>
        <ArrowBackRoundedIcon />
      </IconButton>

      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { sm: 'center' }, mb: 3 }}>
        <Avatar
          src={profile?.avatarUrl || undefined}
          sx={{ width: 120, height: 120, bgcolor: 'primary.main', fontSize: 40 }}
        >
          {(profile?.stageName || '?').charAt(0).toUpperCase()}
        </Avatar>
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>{profile?.stageName}</Typography>
            {profile?.isVerified && <VerifiedRoundedIcon color="primary" />}
          </Stack>
          <Typography variant="body2" color="text.secondary">@{data?.username}</Typography>
          {profile?.bio && (
            <Typography variant="body2" sx={{ mt: 1, maxWidth: 560 }}>{profile.bio}</Typography>
          )}
        </Box>
      </Stack>

      {/* Albums */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Albums</Typography>
      {(!data?.albums || data.albums.length === 0) ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No published albums.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {data.albums.map((a) => (
            <MediaCard
              key={a.id}
              seed={a.id}
              imageUrl={a.coverUrl || undefined}
              title={a.title}
              subtitle={`${a.isSingle ? 'Single' : 'Album'}${fmtDate(a.releaseDate) ? ` · ${fmtDate(a.releaseDate)}` : ''}`}
              onClick={() => navigate(`/album/${a.id}`)}
            />
          ))}
        </Box>
      )}

      <Divider sx={{ mb: 1 }} />

      {/* Songs */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Songs</Typography>
      {(!data?.songs || data.songs.length === 0) ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          No published songs.
        </Typography>
      ) : (
        <List>
          {data.songs.map((s, idx) => {
            const isThis = playingId === s.id;
            return (
              <ListItemButton key={s.id} onClick={() => onPlaySong(idx)} sx={{ borderRadius: 2 }}>
                <ListItemAvatar>
                  <Avatar variant="rounded" src={s.coverUrl || undefined}
                    sx={{ bgcolor: isThis ? 'primary.main' : 'action.selected' }}>
                    {isThis ? <PauseRoundedIcon /> : <PlayArrowRoundedIcon />}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={s.title}
                  secondary={fmtDuration(s.durationSeconds)}
                  slotProps={{ primary: { fontWeight: 600 } }}
                />
              </ListItemButton>
            );
          })}
        </List>
      )}
    </Box>
  );
}