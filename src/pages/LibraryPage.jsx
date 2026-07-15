import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Button, Divider,
  Tabs, Tab, TextField, InputAdornment, Link, Avatar,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import { useSelector, useDispatch } from 'react-redux';
import SongCard from '../components/SongCard';
import AlbumCard from '../components/AlbumCard';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import {
  fetchLikedSongs, fetchSavedSongs, fetchSavedAlbums, fetchFollowedArtists,
} from '../api/social';
import { fetchAlbum } from '../api/catalog';
import { BROWSE } from '../constants/route_constant';

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

const matches = (haystack, needle) =>
  String(haystack || '').toLowerCase().includes(needle);

// Each tab declares its KIND, which drives three things: what it fetches, how it
// searches, and which card it renders. The old page assumed every tab was a song
// grid; now the tab config carries that assumption explicitly instead of baking
// it into the render. That is the whole reason for the `kind` field — a mentor
// reading this should see immediately that "Saved" and "Following" are not songs.
//
//   songs    -> one fetch, SongCard grid, playable queue
//   mixed    -> two fetches (songs + albums) merged, SongCard + AlbumCard
//   artists  -> one fetch, avatar tiles that navigate to the artist page
const TABS = [
  {
    key: 'liked',
    label: 'Liked',
    kind: 'songs',
    icon: <FavoriteRoundedIcon fontSize="small" />,
    source: 'queue',
    emptyTitle: 'Nothing liked yet',
    emptyBody: 'Tap the heart on any track and it will show up here.',
  },
  {
    key: 'saved',
    label: 'Saved',
    kind: 'mixed',
    icon: <BookmarkRoundedIcon fontSize="small" />,
    source: 'queue',
    emptyTitle: 'Nothing saved yet',
    emptyBody: 'Save a song or an album to file it away in your library.',
  },
  {
    key: 'following',
    label: 'Following',
    kind: 'artists',
    icon: <PeopleRoundedIcon fontSize="small" />,
    emptyTitle: 'Not following anyone yet',
    emptyBody: 'Follow an artist and they will appear here.',
  },
];

export default function LibraryPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const [rowsByTab, setRowsByTab] = useState({});
  const [loadingTab, setLoadingTab] = useState(null); // which tab.key is fetching
  const [err, setErr] = useState(null);

  const active = TABS[tab];
  const rows = rowsByTab[active.key];
  const loading = loadingTab === active.key;

  // One loader for every tab. The `kind` decides the fetch strategy; the rows it
  // stores are already normalised into a single array the render can walk. For
  // the mixed tab, songs and albums are tagged with a `_type` so the render knows
  // which card to draw — without that tag the two shapes are ambiguous (both have
  // id/title/coverUrl).
  const load = useCallback(async (tabDef, { force = false } = {}) => {
    if (!force && rowsByTab[tabDef.key]) return;
    setLoadingTab(tabDef.key);
    setErr(null);
    try {
      let items = [];
      if (tabDef.kind === 'songs') {
        const res = await fetchLikedSongs({ page: 1, limit: 100 });
        items = (res.items || []).map((s) => ({ ...s, _type: 'song' }));
      } else if (tabDef.kind === 'mixed') {
        // Two independent lists. Fetch in parallel — neither depends on the other,
        // so serialising them would just double the wait for no reason.
        const [songsRes, albumsRes] = await Promise.all([
          fetchSavedSongs({ page: 1, limit: 100 }),
          fetchSavedAlbums({ page: 1, limit: 100 }),
        ]);
        const songs = (songsRes.items || []).map((s) => ({ ...s, _type: 'song' }));
        const albums = (albumsRes.items || []).map((a) => ({ ...a, _type: 'album' }));
        // Albums first, then songs — a small, predictable ordering so the grid
        // does not reshuffle between loads. (The backend gives each list its own
        // "newest saved first"; we are only deciding how the two lists sit next
        // to each other, not re-sorting within them.)
        items = [...albums, ...songs];
      } else if (tabDef.kind === 'artists') {
        const res = await fetchFollowedArtists({ page: 1, limit: 100 });
        items = (res.items || []).map((a) => ({ ...a, _type: 'artist' }));
      }
      setRowsByTab((prev) => ({ ...prev, [tabDef.key]: items }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoadingTab(null);
    }
  }, [rowsByTab]);

  useEffect(() => { load(active); }, [active, load]);

  const needle = search.trim().toLowerCase();

  // Search reads different fields per type: a song matches on title or artist, an
  // album on title or artist, an artist on stage name. Folding these into one
  // predicate keeps the search box working across a mixed grid.
  const visible = useMemo(() => {
    const all = rows || [];
    if (!needle) return all;
    return all.filter((it) => {
      if (it._type === 'artist') return matches(it.stageName, needle);
      return matches(it.title, needle) || matches(it.artist?.stageName, needle);
    });
  }, [rows, needle]);

  // Only the songs currently visible form the queue, and only real songs — an
  // album tile in the mixed grid is not a queue entry, it plays via its own
  // handler. So the index passed to playFromQueue must be the index WITHIN the
  // songs, not within the mixed array.
  const playableSongs = useMemo(
    () => visible.filter((it) => it._type === 'song'),
    [visible]
  );

  const onSongPlay = (song) => {
    if (loadedId === song.id) {
      dispatch(togglePlay());
      return;
    }
    const idx = playableSongs.findIndex((s) => s.id === song.id);
    dispatch(playFromQueue({
      queue: playableSongs.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist?.stageName ?? 'Unknown artist',
        coverUrl: s.coverUrl || s.album?.coverUrl || undefined,
        source: active.source,
      })),
      index: idx < 0 ? 0 : idx,
    }));
  };

  // Playing a saved album means loading its published tracklist into the queue —
  // the same move ArtistPage makes. The library only holds album metadata, not
  // each album's songs, so we fetch them on demand.
  const onAlbumPlay = async (album) => {
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
      // A failed album fetch should not tear down the library.
    }
  };

  // A saved list can change on another page (unsave a song from Browse, unfollow
  // from an artist page). Dropping the cache on window focus forces a refetch when
  // the user comes back, so the library never shows a stale row.
  useEffect(() => {
    const onFocus = () => setRowsByTab({});
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const countLabel = (() => {
    if (active.kind === 'artists') {
      return `${visible.length} ${visible.length === 1 ? 'artist' : 'artists'}`;
    }
    return `${visible.length} ${visible.length === 1 ? 'item' : 'items'}`;
  })();

  return (
    <Box sx={{ pb: 12 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
        <LibraryMusicRoundedIcon color="primary" />
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Your Library</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Everything you’ve liked, saved, and followed, in one place.
      </Typography>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setSearch(''); }}
          sx={{ minHeight: 40 }}
        >
          {TABS.map((t) => (
            <Tab
              key={t.key}
              icon={t.icon}
              iconPosition="start"
              label={t.label}
              sx={{ minHeight: 40, textTransform: 'none', fontWeight: 700 }}
            />
          ))}
        </Tabs>

        <TextField
          size="small"
          placeholder={`Search ${active.label.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: { sm: 260 } }}
        />
      </Stack>

      <Divider sx={{ mb: 3 }} />

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>{err}</Alert>}

      {loading ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Box key={i} sx={{ width: 180 }}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mb: 1 }} />
              <Skeleton width="80%" />
              <Skeleton width="55%" />
            </Box>
          ))}
        </Box>
      ) : visible.length === 0 ? (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          {needle ? (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                No matches
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Nothing in {active.label.toLowerCase()} matches “{search.trim()}”.
              </Typography>
              <Link component="button" variant="body2" onClick={() => setSearch('')}>
                Clear search
              </Link>
            </>
          ) : (
            <>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {active.emptyTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {active.emptyBody}
              </Typography>
              <Button variant="contained" onClick={() => navigate(BROWSE)}>
                Browse music
              </Button>
            </>
          )}
        </Box>
      ) : (
        <>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            {countLabel}
            {needle ? ` matching “${search.trim()}”` : ''}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {visible.map((it) => {
              if (it._type === 'artist') {
                return (
                  <Box
                    key={`artist-${it.id}`}
                    onClick={() => it.username && navigate(`/artist/${it.username}`)}
                    sx={{
                      width: 180,
                      textAlign: 'center',
                      cursor: it.username ? 'pointer' : 'default',
                      p: 1.5,
                      borderRadius: 3,
                      transition: 'background-color 0.15s ease',
                      '&:hover': { bgcolor: it.username ? 'action.hover' : 'transparent' },
                    }}
                  >
                    <Avatar
                      src={it.avatarUrl || undefined}
                      sx={{
                        width: 120, height: 120, mx: 'auto', mb: 1.5,
                        bgcolor: 'primary.main', fontSize: 44,
                      }}
                    >
                      {(it.stageName || '?').charAt(0).toUpperCase()}
                    </Avatar>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
                      {it.stageName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      Artist
                    </Typography>
                  </Box>
                );
              }

              if (it._type === 'album') {
                return (
                  <Box key={`album-${it.id}`} sx={{ width: 180 }}>
                    <AlbumCard
                      albumId={it.id}
                      seed={it.id}
                      imageUrl={it.coverUrl || undefined}
                      title={it.title}
                      subtitle={`${it.isSingle ? 'Single' : 'Album'}${
                        fmtDate(it.releaseDate) ? ` · ${fmtDate(it.releaseDate)}` : ''
                      }`}
                      isPlaying={playingId === it.id}
                      onClick={() => navigate(`/album/${it.id}`)}
                      onPlayAlbum={() => onAlbumPlay(it)}
                    />
                  </Box>
                );
              }

              // song
              return (
                <Box key={`song-${it.id}`} sx={{ width: 180 }}>
                  <SongCard
                    songId={it.id}
                    seed={it.id}
                    imageUrl={it.coverUrl || it.album?.coverUrl || undefined}
                    title={it.title}
                    subtitle={`${it.artist?.stageName ?? 'Unknown artist'}${
                      it.durationSeconds != null ? ` · ${fmtDuration(it.durationSeconds)}` : ''
                    }`}
                    isPlaying={playingId === it.id}
                    onTogglePlay={() => onSongPlay(it)}
                  />
                </Box>
              );
            })}
          </Box>
        </>
      )}
    </Box>
  );
}