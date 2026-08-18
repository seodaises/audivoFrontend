import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Avatar, Divider,
  List, ListItemButton, ListItemAvatar, ListItemText, IconButton, Button,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import HowToRegRoundedIcon from '@mui/icons-material/HowToRegRounded';
import { useSelector, useDispatch } from 'react-redux';
import AlbumCard from '../components/AlbumCard';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import { fetchArtistByUsername, fetchAlbum } from '../api/catalog';
import { fetchArtistStatus, followArtist, unfollowArtist } from '../api/social';
import { useCoverAccentColor } from '../store/hooks/useCoverAccentColor';

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

const fmtCount = (n) => {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
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

  const [follow, setFollow] = useState(null);
  const [followBusy, setFollowBusy] = useState(false);

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
  useEffect(() => {
    const id = profile?.id;
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchArtistStatus(id);
        if (!cancelled) {
          setFollow({ following: res.following, followerCount: res.followerCount });
        }
      } catch {
        if (!cancelled) setFollow(null);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  const onToggleFollow = async () => {
    if (!profile?.id || !follow || followBusy) return;
    setFollowBusy(true);
    const prev = follow;
    const optimistic = {
      following: !prev.following,
      followerCount: prev.followerCount + (prev.following ? -1 : 1),
    };
    setFollow(optimistic);
    try {
      if (prev.following) {
        await unfollowArtist(profile.id);
      } else {
        await followArtist(profile.id);
      }
      // Re-read the authoritative count so two devices / concurrent followers
      // don't drift. The status endpoint is cheap and this keeps the number true.
      const fresh = await fetchArtistStatus(profile.id);
      setFollow({ following: fresh.following, followerCount: fresh.followerCount });
    } catch (e) {
      setFollow(prev); // roll back
      setErr(e.message);
    } finally {
      setFollowBusy(false);
    }
  };

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


  const onPlayAlbum = async (album) => {
    try {
      const full = await fetchAlbum(album.id);
      const queue = (full.songs || [])
        .filter((s) => s.status === 'published')
        .map((s) => ({
          id: s.id,
          title: s.title,
          artist: full.artist ?? null,
          coverUrl: full.coverUrl ?? null,
        }));
      if (queue.length === 0) return;
      dispatch(playFromQueue({ queue, index: 0 }));
    } catch {
    }
  };
  const accentColor = useCoverAccentColor(profile?.avatarUrl || null);

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

  if (err && !data) {
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

      {err && data && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>{err}</Alert>
      )}

      {/* Header */}
      <Box
        sx={{
          borderRadius: 4, p: { xs: 2, sm: 3 }, mb: 3,
          background: (t) => accentColor
            ? `linear-gradient(135deg, ${accentColor}33, ${t.palette.background.paper} 75%)`
            : `linear-gradient(135deg, ${t.palette.primary.main}33, ${t.palette.background.paper} 75%)`,
          transition: 'background 0.4s ease',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { sm: 'center' } }}>
          <Avatar
            src={profile?.avatarUrl || undefined}
            sx={{ width: 120, height: 120, bgcolor: 'primary.main', fontSize: 40 }}
          >
            {(profile?.stageName || '?').charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }}>{profile?.stageName}</Typography>
              {profile?.isVerified && <VerifiedRoundedIcon color="primary" />}
            </Stack>
            <Typography variant="body2" color="text.secondary">@{data?.username}</Typography>

            {follow && (
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary">
                  {fmtCount(follow.followerCount)}{' '}
                  {follow.followerCount === 1 ? 'follower' : 'followers'}
                </Typography>
                <Button
                  size="small"
                  variant={follow.following ? 'outlined' : 'contained'}
                  color="primary"
                  disabled={followBusy}
                  onClick={onToggleFollow}
                  startIcon={follow.following ? <HowToRegRoundedIcon /> : <PersonAddRoundedIcon />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 5 }}
                >
                  {follow.following ? 'Following' : 'Follow'}
                </Button>
              </Stack>
            )}

            {profile?.bio && (
              <Typography variant="body2" sx={{ mt: 1.5, maxWidth: 560 }}>{profile.bio}</Typography>
            )}
          </Box>
        </Stack>
      </Box>

      {/* Albums */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Albums</Typography>
      {(!data?.albums || data.albums.length === 0) ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          No published albums.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {data.albums.map((a) => (
            <AlbumCard
              key={a.id}
              albumId={a.id}
              seed={a.id}
              imageUrl={a.coverUrl || undefined}
              title={a.title}
              subtitle={`${a.isSingle ? 'Single' : 'Album'}${fmtDate(a.releaseDate) ? ` · ${fmtDate(a.releaseDate)}` : ''}`}
              onClick={() => navigate(`/album/${a.id}`)}
              onPlayAlbum={() => onPlayAlbum(a)}
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