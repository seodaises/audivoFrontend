import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, TextField, InputAdornment, IconButton,
  MenuItem, Alert, Skeleton,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useSelector, useDispatch } from 'react-redux';
import MediaCard from '../components/MediaCard';
import { fetchSongs, fetchGenres, searchCatalog } from '../api/catalog';
import { playTrack, togglePlay } from '../store/slices/playerSlice';

const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

export default function BrowsePage() {
  const dispatch = useDispatch();
  // Read only what the cards need to show their play/pause state.
  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [songs, setSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreId, setGenreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    fetchGenres().then(setGenres).catch(() => setGenres([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      if (debouncedSearch) {
        const res = await searchCatalog(debouncedSearch);
        setSongs(
          res.songs.map((s) => ({
            id: s.id, title: s.title, artist: s.artist,
            durationSeconds: null, genres: [],
          }))
        );
      } else {
        const res = await fetchSongs({ limit: 50, genre: genreId || undefined });
        setSongs(res.songs);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, genreId]);

  useEffect(() => { load(); }, [load]);

  // Clicking a card: if it's the loaded track, toggle play/pause. Otherwise
  // load and play it. The provider + bar do the rest.
  const onCardPlay = (song) => {
    if (loadedId === song.id) {
      dispatch(togglePlay());
    } else {
      dispatch(playTrack({ id: song.id, title: song.title, artist: song.artist }));
    }
  };

  const showingSearch = Boolean(debouncedSearch);

  return (
    // pb leaves room so the last row of cards isn't hidden behind the fixed bar.
    <Box sx={{ pb: 12 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{
          width: '100%', mb: 1,
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', sm: 'center' },
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Browse</Typography>
          <Typography variant="body2" color="text.secondary">
            Published tracks from Audivo artists
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            select size="small" label="Genre" value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            disabled={showingSearch} sx={{ width: 160 }}
          >
            <MenuItem value="">All genres</MenuItem>
            {genres.map((g) => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small" placeholder="Search songs, artists…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 260 } }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchRoundedIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
                endAdornment: search ? (
                  <InputAdornment position="end">
                    <IconButton size="small" aria-label="clear search" onClick={() => setSearch('')}>
                      <CloseRoundedIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              },
            }}
          />
        </Stack>
      </Stack>

      {/* Result count — small signal that the filter/search did something. */}
      {!loading && !err && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
          {showingSearch ? ` matching “${debouncedSearch}”` : ''}
        </Typography>
      )}

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <Box key={i} sx={{ width: 180 }}>
              <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mb: 1 }} />
              <Skeleton width="80%" />
              <Skeleton width="55%" />
            </Box>
          ))
        ) : songs.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
            {showingSearch
              ? `No tracks match “${debouncedSearch}”. Try another search.`
              : 'No published tracks yet. Upload one from the Artist Studio.'}
          </Typography>
        ) : (
          songs.map((s) => (
            <MediaCard
              key={s.id}
              seed={s.id}                 // drives the gradient art (see MediaCard)
              title={s.title}
              subtitle={`${s.artist?.stageName ?? 'Unknown artist'}${
                s.durationSeconds != null ? ` · ${fmtDuration(s.durationSeconds)}` : ''
              }`}
              playable
              isPlaying={playingId === s.id}
              onTogglePlay={() => onCardPlay(s)}
            />
          ))
        )}
      </Box>
    </Box>
  );
}