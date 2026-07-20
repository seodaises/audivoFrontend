import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Avatar, Chip, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress,
  Tooltip, List,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import LibraryMusicRoundedIcon from '@mui/icons-material/LibraryMusicRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import MediaCard from '../components/MediaCard';
import { fetchMyCatalog, updateMyProfile } from '../api/catalog';
import { fetchArtistStatus, fetchMyFollowers } from '../api/social';
import { UPLOAD, LIBRARY } from '../constants/route_constant';

const fmtCount = (n) => {
  if (n == null) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
};

const statusColor = (s) =>
  s === 'published' ? 'success' : s === 'archived' ? 'default' : 'warning';

export default function MyArtistProfilePage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  // Own follower count. It isn't part of the catalog payload (that's about songs,
  // not social), so we ask the same status endpoint the public artist page uses —
  // passing our OWN profile id. followers === null means "not loaded yet".
  const [followerCount, setFollowerCount] = useState(null);
  const [followersOpen, setFollowersOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setData(await fetchMyCatalog()); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Once we know our own artist profile id, fetch how many people follow us. The
  // status endpoint returns { following, followerCount } — `following` is
  // meaningless for yourself (you can't follow yourself), so we only read the count.
  const profileId = data?.profile?.id;
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchArtistStatus(profileId);
        if (!cancelled) setFollowerCount(res.followerCount);
      } catch {
        if (!cancelled) setFollowerCount(null);
      }
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  if (loading) {
    return (
      <Box sx={{ pb: 12 }}>
        <Skeleton variant="circular" width={120} height={120} sx={{ mb: 2 }} />
        <Skeleton width="30%" height={40} />
      </Box>
    );
  }

  if (err) return <Box sx={{ pb: 12 }}><Alert severity="error">{err}</Alert></Box>;

  if (!data?.isArtist) {
    return (
      <Box sx={{ pb: 12, textAlign: 'center', py: 8 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>No artist profile yet</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create your artist profile in the studio to get a public page.
        </Typography>
        <Button variant="contained" onClick={() => navigate(UPLOAD)}>Go to Artist Studio</Button>
      </Box>
    );
  }

  const { profile, albums, songs } = data;
  const publishedCount = songs.filter((s) => s.status === 'published').length;

  return (
    <Box sx={{ pb: 12 }}>
      {/* Profile hero */}
      <Box
        sx={{
          borderRadius: 4, p: { xs: 2, sm: 4 }, mb: 3,
          background: (t) =>
            `linear-gradient(135deg, ${t.palette.primary.main}33, ${t.palette.background.paper} 75%)`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ alignItems: { sm: 'center' } }}>
          <Avatar
            src={profile.avatarUrl || undefined}
            sx={{ width: 120, height: 120, boxShadow: 6, fontSize: 40 }}
          >
            {profile.stageName?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h3" sx={{ fontWeight: 800 }}>{profile.stageName}</Typography>
              {profile.isVerified && (
                <Tooltip title="Verified artist">
                  <VerifiedRoundedIcon color="primary" />
                </Tooltip>
              )}
            </Stack>
            {profile.bio ? (
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 640 }}>
                {profile.bio}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                No bio yet — add one so listeners know who you are.
              </Typography>
            )}
            <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {albums.length} {albums.length === 1 ? 'album' : 'albums'} · {publishedCount} published {publishedCount === 1 ? 'track' : 'tracks'}
              </Typography>

              {/* Follower count. Rendered as a button because it's clickable — it opens
                  the list of who follows you. Disabled (but still shows the number)
                  when the count is 0, since there's nothing to open. Until the status
                  call resolves it shows a dash rather than a flickering 0. */}
              <Button
                variant="text"
                size="small"
                disabled={!followerCount}
                onClick={() => setFollowersOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600, minWidth: 0, px: 1 }}
              >
                {followerCount == null ? '—' : fmtCount(followerCount)}{' '}
                {followerCount === 1 ? 'follower' : 'followers'}
              </Button>

              <Button variant="outlined" size="small" startIcon={<EditRoundedIcon />}
                onClick={() => setEditOpen(true)}>
                Edit profile
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Albums — DISPLAY ONLY.
          
          The publish/archive icon buttons that used to sit under each cover are
          gone. They were a SECOND, worse copy of controls the Library page already
          owns: same endpoint, same statuses, different affordances (tiny unlabelled
          icons here vs proper labelled actions there), and — critically — no
          knowledge of the admin-takedown lock we just added. Two places that can
          change status are two places that must enforce every rule about changing
          status, and the moment they drift you get the bug where an artist can do
          something on one page they can't do on the other.
          
          This page is now what its name says: a PROFILE. It shows you what your
          public presence looks like. Managing the catalog is the Library's job, and
          the button below says so out loud rather than leaving you to guess. */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Your albums</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="text" size="small" startIcon={<LibraryMusicRoundedIcon />}
            onClick={() => navigate(LIBRARY)}>
            Manage in Library
          </Button>
          <Button variant="text" size="small" startIcon={<CloudUploadRoundedIcon />}
            onClick={() => navigate(UPLOAD)}>
            New upload
          </Button>
        </Stack>
      </Stack>

      {albums.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No albums yet.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {albums.map((a) => (
            <Box key={a.id} sx={{ width: 180 }}>
              <Box sx={{ position: 'relative' }}>
                <MediaCard
                  seed={a.id}
                  imageUrl={a.coverUrl || undefined}
                  title={a.title}
                  subtitle={a.isSingle ? 'Single' : 'Album'}
                  onClick={() => navigate(`/album/${a.id}`)}
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Publish, archive, and delete releases from your{' '}
        <Box component="span" onClick={() => navigate(LIBRARY)}
          sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}>
          Library
        </Box>.
      </Typography>

      {editOpen && (
        <EditProfileDialog
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={async () => { setEditOpen(false); await load(); }}
          onError={setErr}
        />
      )}

      {followersOpen && (
        <FollowersDialog onClose={() => setFollowersOpen(false)} />
      )}
    </Box>
  );
}

// The list of people who follow this artist. Fetches on open (not on page load) —
// most visits to the profile don't open it, so there's no reason to pay for the
// request every time. Its own loading/error/empty states keep the dialog honest
// about what it knows.
function FollowersDialog({ onClose }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const res = await fetchMyFollowers({ page: 1, limit: 100 });
        if (!cancelled) setRows(res.items || []);
      } catch (e) {
        if (!cancelled) setErr(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Your followers</DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Stack key={i} direction="row" spacing={2} sx={{ alignItems: 'center', py: 1 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flexGrow: 1 }}>
                  <Skeleton width="50%" />
                  <Skeleton width="30%" />
                </Box>
              </Stack>
            ))}
          </Box>
        ) : err ? (
          <Alert severity="error" sx={{ m: 2 }}>{err}</Alert>
        ) : rows.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <PersonRoundedIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No followers yet. Keep releasing — they’ll come.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {/* A follower is a listener, and a listener has no public page to open —
                so these rows are names, not links. If followers become clickable
                later, it'll be because the payload starts telling us which of them
                are themselves artists; until then a dead link would be a lie. */}
            {rows.map((f) => (
              <Box
                key={f.userId}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 2,
                  px: 2, py: 1.25,
                  borderBottom: '1px solid', borderColor: 'divider',
                  '&:last-of-type': { borderBottom: 'none' },
                }}
              >
                <Avatar>{(f.displayName || f.username || '?').charAt(0).toUpperCase()}</Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {f.displayName || f.username || 'Unknown'}
                  </Typography>
                  {f.username && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      @{f.username}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function EditProfileDialog({ profile, onClose, onSaved, onError }) {
  const [stageName, setStageName] = useState(profile.stageName);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateMyProfile({
        stageName: stageName.trim(),
        bio: bio.trim() || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      await onSaved();
    } catch (e) { onError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Edit artist profile</DialogTitle>
      {saving && <LinearProgress />}
      <DialogContent sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField label="Stage name" value={stageName} onChange={(e) => setStageName(e.target.value)}
            fullWidth autoFocus />
          <TextField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)}
            fullWidth multiline minRows={3} />
          <TextField label="Avatar image URL" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
            fullWidth placeholder="https://…" />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving || !stageName.trim()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}