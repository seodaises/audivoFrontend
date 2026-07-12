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
import { useAuth } from '../store/hooks/useAuth';
import { fetchMyCatalog, setSongStatus } from '../api/catalog';
import { UPLOAD, LIBRARY } from '../constants/route_constant';

// Only the first few drafts show here — this is a nudge, not a second Library.
const DRAFT_PREVIEW_LIMIT = 5;

// Mirrors AdminDashboard's StatCard so both dashboards share one visual language.
// `tone` tints the number for the one metric that's actually a TO-DO (drafts);
// everything else stays neutral, because a count you can't act on shouldn't shout.
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
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, lineHeight: 1.1, color: tone ? `${tone}.main` : 'text.primary' }}
        >
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>{label}</Typography>
      </Box>
    </Paper>
  );
}

function ActionCard({ icon, title, description, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        flex: '1 1 240px', minWidth: 240, p: 2.5, borderRadius: 3, cursor: 'pointer',
        border: '1px solid', borderColor: 'divider',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: 6, borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{title}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">{description}</Typography>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 1.5, color: 'primary.main' }}>
        <Typography variant="button">Open</Typography>
        <ArrowForwardRoundedIcon fontSize="small" />
      </Stack>
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
  // Mirrors the Library empty state so the two pages tell the same story.
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

      {/* The most important thing on this page. Without it, an unverified artist
          hits a publish error with no explanation of why or what to do next.
          This turns a confusing failure into a designed, understandable state. */}
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

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
        <StatCard icon={<MusicNoteRoundedIcon />} label="Published songs" value={published} />
        {/* Drafts is the only tile that's a to-do rather than a statistic — tint it. */}
        <StatCard icon={<EditNoteRoundedIcon />} label="Drafts" value={drafts.length}
          tone={drafts.length > 0 ? 'warning' : undefined} />
        <StatCard icon={<Inventory2RoundedIcon />} label="Archived" value={archived} />
        <StatCard icon={<AlbumRoundedIcon />} label="Albums" value={albums.length} />
      </Box>

      {drafts.length > 0 && (
        <>
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Finish your drafts
            </Typography>
            {drafts.length > DRAFT_PREVIEW_LIMIT && (
              <Button size="small" onClick={() => navigate(LIBRARY)}>
                View all {drafts.length} in Library
              </Button>
            )}
          </Stack>

          <Paper elevation={0}
            sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', mb: 4, overflow: 'hidden' }}>
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
        </>
      )}

      {drafts.length === 0 && songs.length > 0 && (
        <Alert severity="success" variant="outlined" sx={{ mb: 4, borderRadius: 3 }}>
          Everything's published — no drafts waiting on you.
        </Alert>
      )}

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Quick actions</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
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
          title="Your library"
          description="Manage every release — drafts, published, and archived."
          onClick={() => navigate(LIBRARY)}
        />
      </Box>
    </Box>
  );
}