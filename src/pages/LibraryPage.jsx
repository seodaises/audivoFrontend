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
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import RepeatRoundedIcon from '@mui/icons-material/RepeatRounded';
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { useSelector, useDispatch } from 'react-redux';
import SongCard from '../components/SongCard';
import AlbumCard from '../components/AlbumCard';
import { playFromQueue, togglePlay } from '../store/slices/playerSlice';
import {
  fetchLikedSongs, fetchSavedSongs, fetchSavedAlbums, fetchFollowedArtists,
  fetchRecentlyPlayed, fetchMostPlayed, fetchMyComments,
} from '../api/social';
import { deleteComment } from '../api/comments';
import { fetchAlbum } from '../api/catalog';
import { BROWSE } from '../constants/route_constant';
import SearchField from '../components/SearchField';

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
  {
    key: 'recent',
    label: 'Recently played',
    kind: 'history',
    icon: <HistoryRoundedIcon fontSize="small" />,
    source: 'queue',
    emptyTitle: 'Nothing played yet',
    emptyBody: 'Songs you listen to show up here, most recent first.',
  },
  {
    key: 'mostPlayed',
    label: 'Most played',
    kind: 'history',
    icon: <RepeatRoundedIcon fontSize="small" />,
    source: 'queue',
    emptyTitle: 'No top tracks yet',
    emptyBody: 'The songs you play the most will be ranked here.',
  },
  {
    key: 'myComments',
    label: 'My comments',
    kind: 'comments',
    icon: <ChatBubbleOutlineRoundedIcon fontSize="small" />,
    emptyTitle: 'No comments yet',
    emptyBody: 'Comments you leave on songs are collected here.',
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
        const [songsRes, albumsRes] = await Promise.all([
          fetchSavedSongs({ page: 1, limit: 100 }),
          fetchSavedAlbums({ page: 1, limit: 100 }),
        ]);
        const songs = (songsRes.items || []).map((s) => ({ ...s, _type: 'song' }));
        const albums = (albumsRes.items || []).map((a) => ({ ...a, _type: 'album' }));
        items = [...albums, ...songs];
      } else if (tabDef.kind === 'artists') {
        const res = await fetchFollowedArtists({ page: 1, limit: 100 });
        items = (res.items || []).map((a) => ({ ...a, _type: 'artist' }));
      } else if (tabDef.kind === 'history') {
        // Two history tabs share this branch; the key picks the endpoint.
        const res = tabDef.key === 'mostPlayed'
          ? await fetchMostPlayed({ limit: 50 })
          : await fetchRecentlyPlayed({ limit: 50 });
        items = (res.items || []).map((s) => ({ ...s, _type: 'song' }));
      } else if (tabDef.kind === 'comments') {
        const res = await fetchMyComments({ page: 1, limit: 100 });
        items = (res.items || []).map((c) => ({ ...c, _type: 'comment' }));
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

  const visible = useMemo(() => {
    const all = rows || [];
    if (!needle) return all;
    return all.filter((it) => {
      if (it._type === 'artist') return matches(it.stageName, needle);
      if (it._type === 'comment') return matches(it.body, needle) || matches(it.song?.title, needle);
      return matches(it.title, needle) || matches(it.artist?.stageName, needle);
    });
  }, [rows, needle]);

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

  const [deletingId, setDeletingId] = useState(null);
  const onDeleteMyComment = async (comment) => {
    setDeletingId(comment.id);
    try {
      await deleteComment(comment.id);
      setRowsByTab((prev) => ({
        ...prev,
        myComments: (prev.myComments || []).filter((c) => c.id !== comment.id),
      }));
    } catch (e) {
      setErr(e.message);
    } finally {
      setDeletingId(null);
    }
  };

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

        <SearchField
          placeholder={`Search ${active.label.toLowerCase()}…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch('')}
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
                  <Box key={`album-${it.id}`}>
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

              if (it._type === 'comment') {
                return (
                  <Box
                    key={`comment-${it.id}`}
                    sx={{
                      width: '100%',
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      gap: 2,
                      alignItems: 'flex-start',
                    }}
                  >
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {it.body}
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'text.secondary' }}>
                        {it.song?.title && (
                          <Link
                            component="button"
                            variant="caption"
                            onClick={() => it.song?.id && navigate(`/album/${it.song.albumId}`)}
                            sx={{ fontWeight: 600 }}
                          >
                            on “{it.song.title}”
                          </Link>
                        )}
                        <Typography variant="caption">
                          {fmtDate((it.createdAt || '').slice(0, 10)) || ''}
                        </Typography>
                        {it.isHidden && (
                          <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 600 }}>
                            · removed by moderator
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<DeleteOutlineRoundedIcon />}
                      disabled={deletingId === it.id}
                      onClick={() => onDeleteMyComment(it)}
                    >
                      {deletingId === it.id ? 'Deleting…' : 'Delete'}
                    </Button>
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
                    artist={it.artist}
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