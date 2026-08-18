import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Stack, Typography, Tabs, Tab, Alert, Skeleton, Chip, Avatar,
  ListItemButton, ListItemAvatar, List, Divider,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import SearchField from '../components/SearchField';
import SongCard from '../components/SongCard';
import AlbumCard from '../components/AlbumCard';
import TrendingRow from '../components/TrendingRow';
import { searchCatalog, fetchGenres, fetchTrendingSongs } from '../api/catalog';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';

const toTrack = (s) => ({
  id: s.id,
  title: s.title,
  artist: s.artist ?? null,
  coverUrl: s.coverUrl ?? null,
});

const artistNameOf = (s) => s.artist?.stageName ?? 'Unknown artist';

const cardRowSx = { display: 'flex', flexWrap: 'wrap', gap: 2 };
const TRENDING_LIMIT = 8;

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'songs', label: 'Songs' },
  { key: 'albums', label: 'Albums' },
  { key: 'artists', label: 'Artists' },
];

const DEBOUNCE_MS = 350;

export default function SearchPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));

  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get('q') ?? '';

  const [input, setInput] = useState(urlQuery);
  const [results, setResults] = useState(null); // null = nothing searched yet
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [genres, setGenres] = useState([]);
  const [trending, setTrending] = useState([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);

  const requestId = useRef(0);

  useEffect(() => {
    Promise.allSettled([fetchGenres(), fetchTrendingSongs({ limit: TRENDING_LIMIT })])
      .then(([g, t]) => {
        if (g.status === 'fulfilled') setGenres(g.value ?? []);
        if (t.status === 'fulfilled') setTrending(t.value?.songs ?? []);
      })
      .finally(() => setDiscoverLoading(false));
  }, []);


  useEffect(() => {
    const handle = setTimeout(() => {
      const trimmed = input.trim();
      if (trimmed === urlQuery) return;
      // replace: true — one history entry per search, not one per keystroke.
      setSearchParams(trimmed ? { q: trimmed } : {}, { replace: true });
    }, DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [input, urlQuery, setSearchParams]);

  // Fetch whenever the URL query changes.
  useEffect(() => {
    const term = urlQuery.trim();

    if (!term) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    searchCatalog(term)
      .then((data) => {
        if (id !== requestId.current) return; // a newer search has started
        setResults(data);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError(err.message || 'Search failed. Try again.');
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [urlQuery]);

  const songs = results?.songs ?? [];
  const albums = results?.albums ?? [];
  const artists = results?.artists ?? [];
  const totalCount = songs.length + albums.length + artists.length;

  const counts = useMemo(
    () => ({ all: totalCount, songs: songs.length, albums: albums.length, artists: artists.length }),
    [totalCount, songs.length, albums.length, artists.length]
  );

  const playSong = (song, index) => {
    if (playingId === song.id) {
      dispatch(togglePlay());
      return;
    }
    dispatch(playFromQueue({ queue: songs.map(toTrack), index }));
  };

  const playTrending = (index) => {
    const song = trending[index];
    if (!song) return;
    if (playingId === song.id) {
      dispatch(togglePlay());
      return;
    }
    dispatch(playFromQueue({ queue: trending.map(toTrack), index }));
  };

  const showSongs = tab === 'all' || tab === 'songs';
  const showAlbums = tab === 'all' || tab === 'albums';
  const showArtists = tab === 'all' || tab === 'artists';

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
        Search
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Find songs, albums, and artists across Audivo.
      </Typography>

      <SearchField
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onClear={() => setInput('')}
        placeholder="What do you want to listen to?"
        size="medium"
        fullWidth
        autoFocus
        sx={{ maxWidth: 640, mb: 3 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3, maxWidth: 640 }}>
          {error}
        </Alert>
      )}

      {!urlQuery && !loading && (
        <Box>
          {genres.length > 0 && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Browse by genre
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {genres.map((g) => (
                  <Chip
                    key={g.id}
                    label={g.name}
                    clickable
                    onClick={() => navigate(`/browse?genre=${g.id}`)}
                  />
                ))}
              </Stack>
            </Box>
          )}

          {discoverLoading ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 1.5 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={68} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          ) : trending.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Trending now
              </Typography>
              {/* A single edge-to-edge column just stretches each row thin —
                  the gaps move from around the content to inside it. A grid
                  actually uses the width with more content instead. */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 1.5 }}>
                {trending.map((s, idx) => (
                  <TrendingRow
                    key={s.id}
                    rank={idx + 1}
                    variant="song"
                    title={s.title}
                    subtitle={`${artistNameOf(s)}${s.album ? ` · ${s.album.title}` : ''}`}
                    imageUrl={s.coverUrl}
                    isPlaying={playingId === s.id}
                    onTogglePlay={() => playTrending(idx)}
                    onClick={() => s.album && navigate(`/album/${s.album.publicId ?? s.album.id}`)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {genres.length === 0 && !discoverLoading && trending.length === 0 && (
            <Box sx={{ py: 8, color: 'text.secondary' }}>
              <SearchRoundedIcon sx={{ fontSize: 56, mb: 1, opacity: 0.4 }} />
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                Start typing to search
              </Typography>
              <Typography variant="body2">
                Search by song title, album name, or artist.
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {loading && (
        <Box sx={cardRowSx}>
          {Array.from({ length: 10 }).map((_, i) => (
            <Box key={i} sx={{ width: 180 }}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mb: 1 }} />
              <Skeleton width="80%" />
              <Skeleton width="55%" />
            </Box>
          ))}
        </Box>
      )}

      {/* Searched, found nothing. Name the term back so it's clear WHAT missed. */}
      {!loading && urlQuery && results && totalCount === 0 && (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
            No results for “{urlQuery}”
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Check the spelling, or try a shorter or more general term.
          </Typography>
        </Box>
      )}

      {!loading && results && totalCount > 0 && (
        <>
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
          >
            {TABS.map((t) => (
              <Tab
                key={t.key}
                value={t.key}
                label={
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <span>{t.label}</span>
                    <Chip label={counts[t.key]} size="small" sx={{ height: 18, fontSize: 11 }} />
                  </Stack>
                }
              />
            ))}
          </Tabs>

          {showSongs && songs.length > 0 && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Songs
              </Typography>
              <Box sx={cardRowSx}>
                {songs.map((s, idx) => (
                  <Box key={s.id}>
                    <SongCard
                      songId={s.id}
                      songPublicId={s.publicId}
                      title={s.title}
                      subtitle={s.artist?.stageName ?? 'Unknown artist'}
                      imageUrl={s.coverUrl}
                      seed={s.id}
                      artist={s.artist}
                      album={s.album}
                      isPlaying={playingId === s.id}
                      onTogglePlay={() => playSong(s, idx)}
                      onAlbumClick={(albumId) => navigate(`/album/${albumId}`)}
                      showShare
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {showAlbums && albums.length > 0 && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Albums
              </Typography>
              <Box sx={cardRowSx}>
                {albums.map((a) => (
                  <Box key={a.id}>
                    <AlbumCard
                      albumId={a.id}
                      albumPublicId={a.publicId}
                      title={a.title}
                      subtitle={a.artist?.stageName ?? 'Unknown artist'}
                      imageUrl={a.coverUrl}
                      seed={a.id}
                      onClick={() => navigate(`/album/${a.publicId ?? a.id}`)}
                      showShare
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {showArtists && artists.length > 0 && (
            <Box sx={{ mb: 5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Artists
              </Typography>
              <List sx={{ maxWidth: 640 }}>
                {artists.map((a, i) => (
                  <Box key={a.id}>
                    {i > 0 && <Divider component="li" />}
                    <ListItemButton
                      // The artist route is keyed by username, not profile id.
                      // A profile with no username can't be linked to, so it
                      // renders as a non-navigable row instead of a dead link.
                      disabled={!a.username}
                      onClick={() => a.username && navigate(`/artist/${a.username}`)}
                      sx={{ borderRadius: 2 }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {(a.stageName || '?')[0]}
                        </Avatar>
                      </ListItemAvatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 700 }}>
                          {a.stageName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {a.username ? `@${a.username}` : 'Artist'}
                        </Typography>
                      </Box>
                    </ListItemButton>
                  </Box>
                ))}
              </List>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}