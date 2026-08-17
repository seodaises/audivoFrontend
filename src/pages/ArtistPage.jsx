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

  // Follow state is separate from the artist payload on purpose: the catalog
  // fetch is the same for everybody and could be cached, but "am I following
  // this artist" is per-user. Mixing them would make the artist page uncacheable.
  // So we load the artist first, then ask the status endpoint who *I* am to them.
  const [follow, setFollow] = useState(null); // { following, followerCount } | null
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

  // Once we know the artist profile id, fetch the follow status. Runs whenever the
  // profile id changes (i.e. navigating between artists), not on every render.
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
        // A failed status check just means no follow button state — the page
        // itself is still fully usable, so we fail quietly rather than erroring.
        if (!cancelled) setFollow(null);
      }
    })();
    return () => { cancelled = true; };
  }, [profile?.id]);

  // Optimistic toggle. We flip the button and adjust the count immediately so the
  // tap feels instant, then reconcile with the server's real numbers. If the call
  // fails, we roll back to exactly what we had — no guessing.
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
      // A failed album fetch shouldn't tear down the artist page; the click is a
      // nicety, not load-bearing.
    }
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

      {/* A follow action that errored (not the initial load) surfaces here without
          replacing the whole page. */}
      {err && data && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>{err}</Alert>
      )}

      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { sm: 'center' }, mb: 3 }}>
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

          {/* Followers + follow button. Only rendered once the status call has
              resolved — until then there is nothing truthful to show, and a
              flickering 0 would be worse than a brief absence. */}
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