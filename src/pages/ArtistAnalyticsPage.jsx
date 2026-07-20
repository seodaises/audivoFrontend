import { useState, useEffect } from 'react';
import { Box, Typography, Stack, Alert, Skeleton, Chip, Avatar, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import { api } from '../api/client';

const SIGNAL_COLORS = {
  plays: 'primary.main',
  likes: 'success.main',
  saves: 'warning.main',
};

const StatCard = ({ label, value, loading }) => (
  <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 2, px: 2, py: 1.5, minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
      {label}
    </Typography>
    {loading
      ? <Skeleton width={56} height={32} />
      : <Typography sx={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
          {value.toLocaleString()}
        </Typography>}
  </Box>
);

function ScoreBar({ breakdown, score, maxScore }) {
  if (!score || !maxScore) return null;
  const widthPct = Math.max((score / maxScore) * 100, 2);
  const seg = (points) => (points / score) * 100;

  return (
    <Box sx={{ display: 'flex', height: 5, borderRadius: 3, overflow: 'hidden', mt: 0.75, width: `${widthPct}%` }}>
      <Box sx={{ width: `${seg(breakdown.playPoints)}%`, bgcolor: SIGNAL_COLORS.plays }} />
      <Box sx={{ width: `${seg(breakdown.likePoints)}%`, bgcolor: SIGNAL_COLORS.likes }} />
      <Box sx={{ width: `${seg(breakdown.savePoints)}%`, bgcolor: SIGNAL_COLORS.saves }} />
    </Box>
  );
}

function TrackRow({ track, maxScore }) {
  const isArchived = track.status === 'archived';
  // An admin takedown is not the same as the artist archiving their own work —
  // the artist can undo one and not the other, so the label distinguishes them.
  const archiveLabel = track.archivedBy === 'admin'
    ? 'Removed by admin'
    : track.archivedBy === 'album'
      ? 'Archived with album'
      : 'Archived';

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: 2,
        px: 2,
        py: 1.5,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        opacity: isArchived ? 0.72 : 1,
      }}
    >
      <Typography
        sx={{
          width: 28, flexShrink: 0, textAlign: 'center',
          fontWeight: 800, fontSize: 20, lineHeight: 1,
          color: track.rank <= 3 && !isArchived ? 'primary.main' : 'text.disabled',
        }}
      >
        {track.rank}
      </Typography>

      <Avatar
        src={track.coverUrl || undefined}
        variant="rounded"
        sx={{ width: 44, height: 44, flexShrink: 0, bgcolor: 'action.selected' }}
      >
        <MusicNoteRoundedIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
      </Avatar>

      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {track.title}
          </Typography>
          {isArchived && (
            <Chip
              size="small"
              label={archiveLabel}
              sx={{ height: 18, fontSize: 10, fontWeight: 600 }}
              color={track.archivedBy === 'admin' ? 'error' : 'default'}
              variant="outlined"
            />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
          {track.plays.toLocaleString()} plays · {track.likes} likes · {track.saves} saves
        </Typography>
        <ScoreBar breakdown={track.breakdown} score={track.score} maxScore={maxScore} />
      </Box>

      <Tooltip title={`${track.breakdown.playPoints} from plays · ${track.breakdown.likePoints} from likes · ${track.breakdown.savePoints} from saves`}>
        <Box sx={{ textAlign: 'right', flexShrink: 0, cursor: 'help' }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
            {track.score.toLocaleString()}
          </Typography>
          <Typography variant="caption" color="text.disabled">score</Typography>
        </Box>
      </Tooltip>
    </Stack>
  );
}

export default function ArtistAnalyticsPage() {
  const [data, setData] = useState(null);
  const [range, setRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const { data: payload } = await api(`/artist/analytics/tracks?range=${range}`);
        if (alive) setData(payload);
      } catch (e) {
        if (alive) setErr(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [range]);

  const totals = data?.totals ?? { plays: 0, likes: 0, saves: 0, score: 0 };
  const tracks = data?.tracks ?? [];
  const weights = data?.weights ?? { play: 1, like: 2, save: 3 };
  // Bars scale against the strongest track, so a quiet month still produces a
  // readable chart instead of three invisible slivers.
  const maxScore = tracks.length ? tracks[0].score : 0;
  const hasProfile = data?.artistProfileId != null;

  return (
    <Box sx={{ pb: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', mb: 0.5 }}>
        Your analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        How your tracks are performing. Only your own catalogue.
      </Typography>

      {err && <Alert severity="error" sx={{ mb: 3 }}>{err}</Alert>}

      {!loading && !hasProfile && !err && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You don't have an artist profile yet. Create one to start seeing performance data.
        </Alert>
      )}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2.5 }}>
        <StatCard label="Total plays" value={totals.plays} loading={loading} />
        <StatCard label="Likes" value={totals.likes} loading={loading} />
        <StatCard label="Saves" value={totals.saves} loading={loading} />
        <StatCard label="Tracks" value={data?.trackCount ?? 0} loading={loading} />
      </Stack>

      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={range}
          onChange={(_, v) => { if (v) setRange(v); }}
        >
          <ToggleButton value="30d" sx={{ textTransform: 'none', px: 2 }}>Last 30 days</ToggleButton>
          <ToggleButton value="all" sx={{ textTransform: 'none', px: 2 }}>All time</ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="caption" color="text.secondary">
          Score = plays + ({weights.like}× likes) + ({weights.save}× saves)
        </Typography>
      </Stack>

      {loading ? (
        <Stack spacing={1}>
          {[0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={76} />)}
        </Stack>
      ) : tracks.length === 0 ? (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {hasProfile
              ? 'No published tracks yet. Publish something to start collecting plays.'
              : 'Nothing to show yet.'}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {tracks.map((t) => <TrackRow key={t.id} track={t} maxScore={maxScore} />)}
        </Stack>
      )}
    </Box>
  );
}