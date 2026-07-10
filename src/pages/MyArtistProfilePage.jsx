import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Stack, Alert, Skeleton, Avatar, Chip, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, LinearProgress,
  Tooltip, IconButton,
} from '@mui/material';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import UnarchiveRoundedIcon from '@mui/icons-material/UnarchiveRounded';
import PublishRoundedIcon from '@mui/icons-material/PublishRounded';
import MediaCard from '../components/MediaCard';
import { fetchMyCatalog, updateMyProfile, setAlbumStatus } from '../api/catalog';
import { UPLOAD } from '../constants/route_constant';

const statusColor = (s) =>
  s === 'published' ? 'success' : s === 'archived' ? 'default' : 'warning';

export default function MyArtistProfilePage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try { setData(await fetchMyCatalog()); }
    catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const changeAlbumStatus = async (album, next) => {
    setBusyId(album.id);
    try { await setAlbumStatus(album.id, next); await load(); }
    catch (e) { setErr(e.message); }
    finally { setBusyId(null); }
  };

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
            <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {albums.length} {albums.length === 1 ? 'album' : 'albums'} · {publishedCount} published {publishedCount === 1 ? 'track' : 'tracks'}
              </Typography>
              <Button variant="outlined" size="small" startIcon={<EditRoundedIcon />}
                onClick={() => setEditOpen(true)}>
                Edit profile
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Albums with quick status controls */}
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Your albums</Typography>
        <Button variant="text" size="small" startIcon={<CloudUploadRoundedIcon />}
          onClick={() => navigate(UPLOAD)}>
          New upload
        </Button>
      </Stack>

      {albums.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No albums yet.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
          {albums.map((a) => {
            const busy = busyId === a.id;
            return (
              <Box key={a.id} sx={{ width: 180 }}>
                <Box sx={{ position: 'relative' }}>
                  <MediaCard
                    seed={a.id}
                    imageUrl={a.coverUrl || undefined}
                    title={a.title}
                    subtitle={a.isSingle ? 'Single' : 'Album'}
                    onClick={() => navigate(`/album/${a.id}`)}
                  />
                  <Chip size="small" label={a.status} color={statusColor(a.status)}
                    sx={{ position: 'absolute', top: 8, left: 8 }} />
                </Box>
                <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, justifyContent: 'center' }}>
                  {a.status === 'archived' ? (
                    <Tooltip title="Restore album">
                      <span>
                        <IconButton size="small" disabled={busy}
                          onClick={() => changeAlbumStatus(a, 'published')}>
                          <UnarchiveRoundedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  ) : (
                    <>
                      {a.status === 'draft' && (
                        <Tooltip title="Publish album">
                          <span>
                            <IconButton size="small" disabled={busy}
                              onClick={() => changeAlbumStatus(a, 'published')}>
                              <PublishRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title="Archive album">
                        <span>
                          <IconButton size="small" color="warning" disabled={busy}
                            onClick={() => changeAlbumStatus(a, 'archived')}>
                            <Inventory2RoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Box>
            );
          })}
        </Box>
      )}

      <Divider sx={{ mb: 2 }} />
      <Typography variant="body2" color="text.secondary">
        Manage individual tracks from each album's page or your Library.
      </Typography>

      {editOpen && (
        <EditProfileDialog
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={async () => { setEditOpen(false); await load(); }}
          onError={setErr}
        />
      )}
    </Box>
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