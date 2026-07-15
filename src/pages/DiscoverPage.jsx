import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Paper, Chip, TextField, InputAdornment,
} from '@mui/material';
import QueueMusicRoundedIcon from '@mui/icons-material/QueueMusicRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import { fetchPublicPlaylists } from '../api/playlist';
import { PLAYLIST } from '../constants/route_constant';

// Same golden-angle cover gradient as PlaylistsPage / MediaCard, so a playlist
// looks identical whether you find it in your own list or here in discovery.
const gradientFor = (seed = 0) => {
  const h1 = Math.round(seed * 137.508) % 360;
  const h2 = (h1 + 50) % 360;
  return `linear-gradient(135deg, hsl(${h1} 55% 45%), hsl(${h2} 60% 35%))`;
};

// Public playlist discovery. This is the surface the "Public" toggle was always
// promising: a place where a playlist someone else marked public actually
// becomes findable. Read-only — clicking through opens the playlist, but only
// its owner can edit it (the backend enforces that; the detail page hides the
// controls when isOwner is false).
export default function DiscoverPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');

  // Debounce the title search: fire 350ms after the last keystroke, not on every
  // one. `silent` skips the skeleton while typing so results update in place
  // instead of flashing to grey on each character.
  const load = useCallback(async (term, { silent = false } = {}) => {
    if (!silent) setLoading(true);
    setErr('');
    try {
      const data = await fetchPublicPlaylists({ page: 1, limit: 100, search: term });
      setItems(data.items || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = search === '';
    const t = setTimeout(() => load(search, { silent: !first }), first ? 0 : 350);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>Discover</Typography>
        <Typography variant="body2" color="text.secondary">
          Public playlists shared by the whole community.
        </Typography>
      </Box>

      <TextField
        fullWidth
        size="small"
        placeholder="Search playlists by title…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 3, maxWidth: 480 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchRoundedIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr('')}>{err}</Alert>}

      {loading ? (
        <Stack spacing={1.5}>
          {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={72} />)}
        </Stack>
      ) : items.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 6, textAlign: 'center', borderRadius: 3, borderStyle: 'dashed' }}
        >
          <PublicRoundedIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {search ? 'No matches' : 'Nothing public yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {search
              ? 'No public playlists match that title.'
              : 'When people make playlists public, they show up here.'}
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={1.5}>
          {items.map((p) => (
            <Paper
              key={p.id}
              variant="outlined"
              onClick={() => navigate(`${PLAYLIST}/${p.id}`)}
              sx={{
                p: 1.5, borderRadius: 3, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 2,
                transition: 'background-color .15s ease',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: 2, flexShrink: 0,
                  background: gradientFor(p.id),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <QueueMusicRoundedIcon sx={{ color: 'rgba(255,255,255,.85)' }} />
              </Box>

              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
                    {p.title}
                  </Typography>
                  {p.isMine && (
                    <Chip size="small" label="Yours" color="primary" variant="outlined" />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {/* Whose playlist this is — the reason a discovery list needs the
                      owner join. Falls back gracefully if the owner is gone. */}
                  by {p.owner?.displayName || p.owner?.username || 'Unknown'}
                  {' · '}
                  {p.trackCount ?? 0} {p.trackCount === 1 ? 'track' : 'tracks'}
                  {p.description ? ` · ${p.description}` : ''}
                </Typography>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}