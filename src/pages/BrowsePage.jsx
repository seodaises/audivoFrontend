import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Stack, TextField, InputAdornment, IconButton,
  MenuItem, Alert, Skeleton, Chip, Divider, Tabs, Tab,
} from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import SongCard from '../components/SongCard';
import AlbumCard from '../components/AlbumCard';
import { fetchSongs, fetchAlbums, fetchGenres, searchCatalog, fetchAlbum } from '../api/catalog';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import SearchField from '../components/SearchField';

const fmtDuration = (secs) => {
  if (secs == null) return '—';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// Reduce a song row to the light shape the player queue holds.
const toTrack = (s) => ({
  id: s.id, title: s.title,
  artist: s.artist ?? null,
  coverUrl: s.coverUrl ?? null,
});

export default function BrowsePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const playingId = useSelector((s) => (s.player.isPlaying ? s.player.current?.id : null));
  const loadedId = useSelector((s) => s.player.current?.id);

  const [songs, setSongs] = useState([]);
  const [albums, setAlbums] = useState([]);           // NEW: album row
  const [artistHits, setArtistHits] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genreId, setGenreId] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [contentTab, setContentTab] = useState('albums');

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
            album: s.album ?? null,
            coverUrl: s.coverUrl ?? null,
            durationSeconds: null, genres: [],
          }))
        );
        setAlbums(res.albums || []);
        setArtistHits(res.artists || []);
      } else {
        // Songs and albums load together — one paint, not two.
        const [songRes, albumRes] = await Promise.all([
          fetchSongs({ limit: 50, genre: genreId || undefined }),
          fetchAlbums({ limit: 20 }),
        ]);
        setSongs(songRes.songs);
        setAlbums(albumRes.albums);
        setArtistHits([]);
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, genreId]);

  useEffect(() => { load(); }, [load]);

  const onCardPlay = (song, idx) => {
    if (loadedId === song.id) {
      dispatch(togglePlay());
    } else {
      dispatch(playFromQueue({ queue: songs.map(toTrack), index: idx }));
    }
  };
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
      if (queue.length === 0) return;   // nothing playable — do nothing quietly
      dispatch(playFromQueue({ queue, index: 0 }));
    } catch (e) {
      setErr(e.message);
    }
  };

  const showingSearch = Boolean(debouncedSearch);

  return (
    <Box sx={{ pb: 12 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ width: '100%', mb: 1, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>Browse</Typography>
          <Typography variant="body2" color="text.secondary">
            Albums and tracks from Audivo artists
          </Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <TextField
            select size="small" label="Genre" value={genreId}
            onChange={(e) => setGenreId(e.target.value)}
            disabled={showingSearch} sx={{ width: { xs: '100%', sm: 160 } }}
          >
            <MenuItem value="">All genres</MenuItem>
            {genres.map((g) => (
              <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
            ))}
          </TextField>

          <SearchField
            placeholder="Search songs, artists…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Stack>
      </Stack>

      {/* Artist matches (search only) */}
      {showingSearch && artistHits.length > 0 && (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="overline" color="text.secondary">Artists</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
            {artistHits.map((a) => (
              <Chip
                key={a.id}
                icon={<PersonRoundedIcon />}
                label={a.stageName}
                onClick={() => a.username && navigate(`/artist/${a.username}`)}
                clickable={Boolean(a.username)}
                variant="outlined"
              />
            ))}
          </Stack>
          <Divider sx={{ mt: 2 }} />
        </Box>
      )}

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}

      <Tabs
        value={contentTab}
        onChange={(_, value) => setContentTab(value)}
        sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="albums" label="Albums" sx={{ textTransform: 'none', fontWeight: 700 }} />
        <Tab value="songs" label="Songs" sx={{ textTransform: 'none', fontWeight: 700 }} />
      </Tabs>

      {contentTab === 'albums' ? (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Albums</Typography>
          {loading ? (
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" width={180} height={230} sx={{ borderRadius: 3 }} />
              ))}
            </Box>
          ) : albums.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {showingSearch ? 'No matching albums.' : 'No published albums yet.'}
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
              {albums.map((a) => (
                <AlbumCard
                  key={a.id}
                  albumId={a.id}
                  seed={a.id}
                  imageUrl={a.coverUrl || undefined}
                  title={a.title}
                  subtitle={a.artist?.stageName ?? (a.isSingle ? 'Single' : 'Album')}
                  onClick={() => navigate(`/album/${a.id}`)}
                  onPlayAlbum={() => onAlbumPlay(a)}
                />
              ))}
            </Box>
          )}
        </Box>
      ) : (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Songs</Typography>
          {!loading && !err && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
              {showingSearch ? ` matching “${debouncedSearch}”` : ''}
            </Typography>
          )}

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
                  : 'No published tracks yet.'}
              </Typography>
            ) : (
              songs.map((s, idx) => (
                <SongCard
                  key={s.id}
                  songId={s.id}
                  seed={s.id}
                  imageUrl={s.coverUrl || undefined}
                  title={s.title}
                  subtitle={`${s.artist?.stageName ?? 'Unknown artist'}${
                    s.durationSeconds != null ? ` \u00b7 ${fmtDuration(s.durationSeconds)}` : ''
                  }`}
                  artist={s.artist}
                  album={s.album ?? null}
                  isPlaying={playingId === s.id}
                  onTogglePlay={() => onCardPlay(s, idx)}
                  onAlbumClick={(albumId) => navigate(`/album/${albumId}`)}
                  onArtistClick={(a) => navigate(`/artist/${a.username}`)}
                />
              ))
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}