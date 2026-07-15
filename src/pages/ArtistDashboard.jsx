import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Stack, Chip, Alert, Skeleton, Button,
  List, ListItem, ListItemAvatar, ListItemText, Avatar, alpha,
} from '@mui/material';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import AlbumRoundedIcon from '@mui/icons-material/AlbumRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import { useAuth } from '../store/hooks/useAuth';
import { fetchMyCatalog, setSongStatus } from '../api/catalog';
import { UPLOAD, MY_CATALOG } from '../constants/route_constant';
import GenrePlaysChart from '../components/GenrePlaysChart';

// Only the first few drafts show here — this is a nudge, not a second Library.
const DRAFT_PREVIEW_LIMIT = 5;

// Compact large numbers: 1200 -> "1.2K", 3_000_000 -> "3M". Keeps a play count of
// six figures from blowing out a stat tile's width.
const fmtCount = (n) => {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
};

function StatCard({ icon, label, value, tone }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 180px', minWidth: 180, p: 2.5, borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        display: 'flex', alignItems: 'center', gap: 2,
      }}
    >
      <Box
        sx={{
          width: 48, height: 48, borderRadius: 2, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: 'primary.main', color: 'primary.contrastText',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5"
          sx={{ fontWeight: 800, lineHeight: 1.1, color: tone ? `${tone}.main` : 'text.primary' }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
      </Box>
    </Paper>
  );
}

// Deliberately the SAME dimensions as AdminDashboard's ActionCard, not the wide
// hero cards this page used to have. These are rail items now — a narrow column of
// links, sized to be scanned. The old three-across layout was the reason the page
// looked abandoned: three cards spanning the full width and then nothing beneath
// them is a landing page, not a dashboard.
function ActionCard({ icon, title, description, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2, borderRadius: 3, cursor: 'pointer',
        border: '1px solid', borderColor: 'divider',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': { transform: 'translateY(-2px)', boxShadow: 4, borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.75 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flexGrow: 1 }}>{title}</Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {description}
      </Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1, color: 'primary.main' }}>
        <Typography variant="button" sx={{ fontSize: 12 }}>Open</Typography>
        <ArrowForwardRoundedIcon sx={{ fontSize: 14 }} />
      </Stack>
    </Paper>
  );
}

// A highlight card for one standout song — "most played" or "most liked". It's a
// celebration tile, not a control: it names the metric, the song, and the number,
// and stops there. When the catalog has no qualifying song (nobody's played or
// liked anything yet), it shows an encouraging empty state instead of a blank.
function TopSongCard({ icon, label, song, metricValue, metricNoun, accent = 'primary' }) {
  return (
    <Paper
      elevation={0}
      sx={{
        flex: '1 1 260px', minWidth: 240, p: 2.5, borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        display: 'flex', flexDirection: 'column', gap: 1.5,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: `${accent}.main` }}>
        {icon}
        <Typography variant="overline" sx={{ fontWeight: 800, letterSpacing: 0.5 }}>
          {label}
        </Typography>
      </Stack>

      {song ? (
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Avatar variant="rounded" src={song.coverUrl || undefined}
            sx={{ width: 56, height: 56, bgcolor: 'action.selected' }}>
            <MusicNoteRoundedIcon />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {song.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {song.album?.title || 'Single'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: `${accent}.main`, mt: 0.25 }}>
              {fmtCount(metricValue)} {metricNoun}
            </Typography>
          </Box>
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          No {metricNoun} yet — once listeners engage, your top track shows up here.
        </Typography>
      )}
    </Paper>
  );
}

export default function ArtistDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      setData(await fetchMyCatalog());
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Publish straight from the dashboard — same owner-gated endpoint Library uses.
  const publishSong = async (song) => {
    setBusyId(song.id);
    try { await setSongStatus(song.id, 'published'); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

  if (loading) {
    return (
      <Box>
        <Skeleton width="35%" height={44} sx={{ mb: 3 }} />
        <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width={180} height={92} sx={{ borderRadius: 3 }} />
          ))}
        </Stack>
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  if (err) return <Alert severity="error">{err}</Alert>;

  // No artist profile yet. One clear action — don't render a dashboard of zeros.
  if (!data?.isArtist) {
    return (
      <Box sx={{ textAlign: 'center', py: 10 }}>
        <LibraryMusicRoundedIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Set up your artist profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a profile to start uploading tracks and building your catalog.
        </Typography>
        <Button variant="contained" startIcon={<CloudUploadRoundedIcon />}
          onClick={() => navigate(UPLOAD)}>
          Go to Artist Studio
        </Button>
      </Box>
    );
  }

  const { profile, songs, albums } = data;

  const published = songs.filter((s) => s.status === 'published').length;
  const drafts = songs.filter((s) => s.status === 'draft');
  const archived = songs.filter((s) => s.status === 'archived').length;

  // Catalog-wide play total. Every song carries its own playCount, so the total is
  // just their sum — no separate endpoint. Archived plays count too: they're real
  // listens that happened, not erased by a later archive.
  const totalPlays = songs.reduce((sum, s) => sum + (s.playCount || 0), 0);

  // Top performers. We pick the single most-played and most-liked song across the
  // whole catalog. `reduce` with a null seed handles the empty-catalog case (no
  // songs -> null -> the card renders its empty state instead of crashing on
  // undefined). Ties resolve to whichever song reduce sees first; for a "your top
  // song" nudge that's fine — it's a highlight, not a leaderboard.
  const pickTop = (key) =>
    songs.reduce((best, s) => {
      const v = s[key] || 0;
      if (v <= 0) return best;               // a zero-play/zero-like song is not a "top" anything
      if (!best || v > (best[key] || 0)) return s;
      return best;
    }, null);

  const mostPlayed = pickTop('playCount');
  const mostLiked = pickTop('likeCount');

  const genrePlays = (() => {
    const acc = new Map();
    for (const s of songs) {
      if (s.status !== 'published') continue; // drafts have no plays; archived plays are history
      for (const g of s.genres || []) {
        const prev = acc.get(g.id) || { id: g.id, name: g.name, plays: 0 };
        prev.plays += s.playCount || 0;
        acc.set(g.id, prev);
      }
    }
    return [...acc.values()].sort((a, b) => b.plays - a.plays);
  })();

  const isVerified = profile?.isVerified;
  const name = user?.name || profile?.stageName || 'there';

  return (
    <Box sx={{ pb: 4 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px' }}>
          Your studio
        </Typography>
        <Chip
          size="small"
          label={isVerified ? 'Verified' : 'Pending verification'}
          color={isVerified ? 'success' : 'warning'}
          variant={isVerified ? 'filled' : 'outlined'}
          sx={{ fontWeight: 700 }}
        />
      </Stack>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {name}. Here's where your catalog stands.
      </Typography>

      {!isVerified && (
        <Paper
          elevation={0}
          sx={(t) => ({
            p: 2, mb: 3, borderRadius: 3,
            display: 'flex', gap: 1.5, alignItems: 'flex-start',
            bgcolor: alpha(t.palette.warning.main, 0.12),
            border: `1px solid ${alpha(t.palette.warning.main, 0.3)}`,
          })}
        >
          <HourglassTopRoundedIcon sx={{ color: 'warning.main', mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.main' }}>
              Your profile is awaiting admin approval
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can upload tracks and save drafts now. Publishing unlocks once an admin verifies you.
            </Typography>
          </Box>
        </Paper>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        {/* Total plays leads the row — it's the number an artist actually cares
            about. fmtCount keeps a big total from stretching the tile. */}
        <StatCard icon={<TrendingUpRoundedIcon />} label="Total plays" value={fmtCount(totalPlays)} />
        <StatCard icon={<MusicNoteRoundedIcon />} label="Published songs" value={published} />
        {/* Drafts is the only tile that's a to-do rather than a statistic — tint it. */}
        <StatCard icon={<EditNoteRoundedIcon />} label="Drafts" value={drafts.length}
          tone={drafts.length > 0 ? 'warning' : undefined} />
        <StatCard icon={<Inventory2RoundedIcon />} label="Archived" value={archived} />
        <StatCard icon={<AlbumRoundedIcon />} label="Albums" value={albums.length} />
      </Box>

      {/* Two highlight cards: your best-performing song by each measure. Only shown
          once there's a catalog to have a "top" song in — an artist staring at an
          empty studio doesn't need two cards telling them they have no plays. */}
      {songs.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
          <TopSongCard
            icon={<PlayArrowRoundedIcon />}
            label="Most played"
            song={mostPlayed}
            metricValue={mostPlayed?.playCount || 0}
            metricNoun="plays"
            accent="primary"
          />
          <TopSongCard
            icon={<FavoriteRoundedIcon />}
            label="Most liked"
            song={mostLiked}
            metricValue={mostLiked?.likeCount || 0}
            metricNoun="likes"
            accent="error"
          />
        </Box>
      )}

      {/* Two columns, mirroring AdminDashboard exactly: content left, action rail
          right. The two dashboards are now the same PAGE with different data, which
          is the point — a user who learns one has learned the other. */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2fr) minmax(300px, 1fr)' },
          gap: 3,
          alignItems: 'start',
        }}
      >
        {/* LEFT — the content. */}
        <Stack spacing={3} sx={{ minWidth: 0 }}>
          {drafts.length > 0 && (
            <Box>
              <Stack direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Finish your drafts
                </Typography>
                {drafts.length > DRAFT_PREVIEW_LIMIT && (
                  <Button size="small" onClick={() => navigate(MY_CATALOG)}>
                    View all {drafts.length} in My Catalog
                  </Button>
                )}
              </Stack>

              <Paper elevation={0}
                sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                <List disablePadding>
                  {drafts.slice(0, DRAFT_PREVIEW_LIMIT).map((s, i, arr) => (
                    <ListItem
                      key={s.id}
                      divider={i < arr.length - 1}
                      secondaryAction={
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={busyId === s.id || !isVerified}
                          onClick={() => publishSong(s)}
                        >
                          {busyId === s.id ? 'Publishing…' : 'Publish'}
                        </Button>
                      }
                      sx={{ py: 1.25 }}
                    >
                      <ListItemAvatar>
                        <Avatar variant="rounded" src={s.coverUrl || undefined}
                          sx={{ bgcolor: 'action.selected' }}>
                          <MusicNoteRoundedIcon fontSize="small" />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={s.title}
                        secondary={
                          s.album
                            ? `${s.album.title}${s.trackNumber ? ` · track ${s.trackNumber}` : ''}`
                            : 'Single'
                        }
                        slotProps={{ primary: { fontWeight: 600 } }}
                        sx={{ pr: 10 }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Box>
          )}

          {drafts.length === 0 && songs.length > 0 && (
            <Alert severity="success" variant="outlined" sx={{ borderRadius: 3 }}>
              Everything's published: no drafts waiting on you.
            </Alert>
          )}

          <Box>
            <Stack direction="row" spacing={1}
              sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Where your plays come from
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Your published tracks
              </Typography>
            </Stack>
            <GenrePlaysChart data={genrePlays} loading={false} />
          </Box>
        </Stack>

        {/* RIGHT — the action rail. */}
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Quick actions</Typography>
          <ActionCard
            icon={<CloudUploadRoundedIcon />}
            title="Upload a track"
            description="Add a new song to an album or release a single."
            onClick={() => navigate(UPLOAD)}
          />
          {user?.username && (
            <ActionCard
              icon={<VisibilityRoundedIcon />}
              title="View your public page"
              description="See exactly what listeners see when they find you."
              onClick={() => navigate(`/artist/${user.username}`)}
            />
          )}
          <ActionCard
            icon={<LibraryMusicRoundedIcon />}
            title="Your Catalog"
            description="Manage every release, drafts, published, and archived."
            onClick={() => navigate(MY_CATALOG)}
          />
        </Stack>
      </Box>
    </Box>
  );
}