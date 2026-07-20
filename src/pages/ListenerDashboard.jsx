import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, Tabs, Tab, Alert, Skeleton, Avatar, Chip,
} from '@mui/material';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import GreetingHeader from '../components/GreetingHeader';
import DiscoverCard from '../components/DiscoverCard';
import TrendingRow from '../components/TrendingRow';
import { fetchMostPlayed, fetchRecentlyPlayed } from '../api/social';
import { fetchTrendingSongs, fetchTrendingAlbums, fetchTrendingArtists } from '../api/catalog';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';

const toTrack = (s) => ({
  id: s.id,
  title: s.title,
  artist: s.artist ?? s.artistProfile ?? null,
  coverUrl: s.coverUrl ?? null,
});

const artistNameOf = (s) =>
  s.artist?.stageName ?? s.artistProfile?.stageName ?? 'Unknown artist';

export default function ListenerDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [mostPlayed, setMostPlayed] = useState([]);
  const [recent, setRecent] = useState([]);
  const [trendSongs, setTrendSongs] = useState([]);
  const [trendAlbums, setTrendAlbums] = useState([]);
  const [trendArtists, setTrendArtists] = useState([]);

  const [trendTab, setTrendTab] = useState('songs');

  // One load for the whole page. Promise.allSettled rather than Promise.all on
  // purpose: this dashboard has five independent panels, and one failing
  // endpoint should degrade that panel only — not blank the entire page.
  const load = useCallback(async () => {
    setLoading(true);
    setErr('');
    const results = await Promise.allSettled([
      fetchMostPlayed({ limit: 4 }),
      fetchRecentlyPlayed({ limit: 6 }),
      fetchTrendingSongs({ limit: 10 }),
      fetchTrendingAlbums({ limit: 10 }),
      fetchTrendingArtists({ limit: 10 }),
    ]);

    const [mp, rp, ts, ta, tar] = results;
    if (mp.status === 'fulfilled') setMostPlayed(mp.value?.items ?? []);
    if (rp.status === 'fulfilled') setRecent(rp.value?.items ?? []);
    if (ts.status === 'fulfilled') setTrendSongs(ts.value?.songs ?? []);
    if (ta.status === 'fulfilled') setTrendAlbums(ta.value?.albums ?? []);
    if (tar.status === 'fulfilled') setTrendArtists(tar.value?.artists ?? []);

    if (results.every((r) => r.status === 'rejected')) {
      setErr('Could not load your dashboard. Please try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Play a song within the list it belongs to, so "next" continues down that
  // list rather than dead-ending after one track.
  const playFromList = (list, idx) => {
    const song = list[idx];
    if (!song) return;
    if (loadedId === song.id) {
      dispatch(togglePlay());
    } else {
      dispatch(playFromQueue({ queue: list.map(toTrack), index: idx }));
    }
  };

  const topAlbum = trendAlbums[0] ?? null;
  const lastPlayed = recent[0] ?? null;

  return (
    <Box>
      <GreetingHeader />

      {err && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErr('')}>{err}</Alert>}

      {/* ── DISCOVER ─────────────────────────────────────────────────── */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Discover</Typography>

      {/* alignItems:'stretch' makes all three cards match the tallest one, so
          the row reads as a single band rather than three ragged boxes. */}
      <Stack
        direction="row"
        spacing={2}
        sx={{ flexWrap: 'wrap', gap: 2, mb: 4, alignItems: 'stretch' }}
      >
        {/* On Repeat — YOUR habits, from play history. */}
        <DiscoverCard
          label="ON REPEAT"
          caption="your most played, 30 days"
          emphasis={1}
          icon={<ReplayRoundedIcon sx={{ fontSize: 17 }} />}
          loading={loading}
          empty={mostPlayed.length === 0}
          emptyText="Play a few tracks and this fills in."
          onClick={mostPlayed.length ? () => playFromList(mostPlayed, 0) : null}
          actionLabel="Play top track"
        >
          {mostPlayed[0] && (
            <>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ alignItems: 'center', mb: 1.5 }}
              >
                <Avatar
                  src={mostPlayed[0].coverUrl || undefined}
                  sx={{ width: 52, height: 52, bgcolor: 'action.selected' }}
                />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                    {mostPlayed[0].title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                    {artistNameOf(mostPlayed[0])}
                    {mostPlayed[0].myPlayCount != null ? ` · ${mostPlayed[0].myPlayCount} plays` : ''}
                  </Typography>
                </Box>
              </Stack>
              {mostPlayed.slice(1, 3).map((s) => (
                <Typography
                  key={s.id}
                  variant="caption"
                  noWrap
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  {s.title}
                  {s.myPlayCount != null ? ` · ${s.myPlayCount}` : ''}
                </Typography>
              ))}
            </>
          )}
        </DiscoverCard>

        {/* Album of the Week — the CROWD's opinion, from trending. */}
        <DiscoverCard
          label="ALBUM OF THE WEEK"
          caption="highest scoring album"
          emphasis={2}
          icon={<AlbumRoundedIcon sx={{ fontSize: 17 }} />}
          loading={loading}
          empty={!topAlbum}
          emptyText="Not enough listening yet."
          onClick={topAlbum ? () => navigate(`/album/${topAlbum.id}`) : null}
          actionLabel="Open album"
        >
          {topAlbum && (
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Avatar
                src={topAlbum.coverUrl || undefined}
                variant="rounded"
                sx={{ width: 62, height: 62, bgcolor: 'action.selected' }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                  {topAlbum.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {topAlbum.artist?.stageName ?? 'Unknown artist'}
                </Typography>
                <Chip
                  size="small"
                  label={`${topAlbum.plays ?? 0} plays`}
                  sx={{ mt: 0.75, height: 20, fontSize: 11, fontWeight: 700 }}
                  color="primary"
                  variant="outlined"
                />
              </Box>
            </Stack>
          )}
        </DiscoverCard>

        {/* Jump Back In — YOUR history, with a resume affordance. */}
        <DiscoverCard
          label="JUMP BACK IN"
          caption="recently played"
          emphasis={3}
          icon={<HistoryRoundedIcon sx={{ fontSize: 17 }} />}
          loading={loading}
          empty={recent.length === 0}
          emptyText="Your listening history will show here."
          onClick={recent.length ? () => playFromList(recent, 0) : null}
          actionLabel="Resume"
        >
          {lastPlayed && (
            <>
              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                {recent.slice(0, 4).map((s) => (
                  <Avatar
                    key={s.id}
                    src={s.coverUrl || undefined}
                    sx={{ width: 44, height: 44, bgcolor: 'action.selected' }}
                  />
                ))}
              </Stack>
              <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 600 }}>
                {lastPlayed.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                {artistNameOf(lastPlayed)}
              </Typography>
            </>
          )}
        </DiscoverCard>
      </Stack>

      {/* ── TRENDING ─────────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'baseline', mb: 0.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Trending</Typography>
        <Typography variant="caption" color="text.disabled">last 30 days</Typography>
      </Stack>

      <Tabs
        value={trendTab}
        onChange={(_, v) => setTrendTab(v)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="songs" label="Songs" sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab value="albums" label="Albums" sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab value="artists" label="Artists" sx={{ textTransform: 'none', fontWeight: 700 }} />
      </Tabs>

      {loading ? (
        <Stack spacing={1}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={74} />)}
        </Stack>
      ) : (
        <>
          {trendTab === 'songs' && (
            trendSongs.length === 0 ? (
              <EmptyTrending what="songs" />
            ) : (
              <Stack spacing={1}>
                {trendSongs.map((s, idx) => (
                  <TrendingRow
                    key={s.id}
                    rank={s.rank}
                    variant="song"
                    title={s.title}
                    subtitle={`${artistNameOf(s)}${s.album ? ` · ${s.album.title}` : ''}`}
                    imageUrl={s.coverUrl}
                    breakdown={`${s.plays} plays · ${s.likes} likes · ${s.saves} saves`}
                    isPlaying={playingId === s.id}
                    onTogglePlay={() => playFromList(trendSongs, idx)}
                    onClick={() => s.album && navigate(`/album/${s.album.id}`)}
                  />
                ))}
              </Stack>
            )
          )}

          {trendTab === 'albums' && (
            trendAlbums.length === 0 ? (
              <EmptyTrending what="albums" />
            ) : (
              <Stack spacing={1}>
                {trendAlbums.map((a) => (
                  <TrendingRow
                    key={a.id}
                    rank={a.rank}
                    variant="album"
                    title={a.title}
                    subtitle={a.artist?.stageName ?? 'Unknown artist'}
                    imageUrl={a.coverUrl}
                    breakdown={`${a.plays} plays · ${a.saves} saves`}
                    onClick={() => navigate(`/album/${a.id}`)}
                  />
                ))}
              </Stack>
            )
          )}

          {trendTab === 'artists' && (
            trendArtists.length === 0 ? (
              <EmptyTrending what="artists" />
            ) : (
              <Stack spacing={1}>
                {trendArtists.map((a) => (
                  <TrendingRow
                    key={a.id}
                    rank={a.rank}
                    variant="artist"
                    title={a.stageName}
                    subtitle={a.username ? `@${a.username}` : ''}
                    imageUrl={a.avatarUrl}
                    breakdown={`${a.plays} plays · ${a.follows} follows`}
                    onClick={() => a.username && navigate(`/artist/${a.username}`)}
                  />
                ))}
              </Stack>
            )
          )}
        </>
      )}
    </Box>
  );
}

function EmptyTrending({ what }) {
  return (
    <Box
      sx={{
        border: 1, borderColor: 'divider', borderStyle: 'dashed',
        borderRadius: 3, p: 4, textAlign: 'center',
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
        Not enough listening yet
      </Typography>
      <Typography variant="caption" color="text.disabled">
        Play a few tracks and trending {what} will fill in.
      </Typography>
    </Box>
  );
}