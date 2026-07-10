import { useState, useEffect } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, TextField, Button, Stack,
  Alert, Paper, Chip, MenuItem, CircularProgress, Divider,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import {
  createArtistProfile, getMyArtistProfile, createAlbum,
  uploadSong, setAlbumStatus, setSongStatus, fetchGenres,
} from '../api/catalog';

const STEPS = ['Artist profile', 'Album', 'Upload song', 'Publish'];

export default function ArtistStudioPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [notice, setNotice] = useState(null);

  // Carried state across steps — the IDs the next step needs.
  const [profile, setProfile] = useState(null);   // { id, stageName, isVerified }
  const [album, setAlbum] = useState(null);        // { id, title, status }
  const [song, setSong] = useState(null);          // { id, title, status }

  // Step 1 fields
  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');

  // Step 2 fields
  const [albumTitle, setAlbumTitle] = useState('');
  const [isSingle, setIsSingle] = useState(false);

  // Step 3 fields
  const [songTitle, setSongTitle] = useState('');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [file, setFile] = useState(null);
  const [genres, setGenres] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);

  // On mount: do they already have a profile? If so, skip step 1.
  useEffect(() => {
    getMyArtistProfile()
      .then((p) => {
        setProfile(p);
        setActiveStep(1); // profile exists -> jump to album
      })
      .catch(() => { /* 404 = no profile yet, stay on step 0 */ });
    fetchGenres().then(setGenres).catch(() => setGenres([]));
  }, []);

  const wrap = async (fn) => {
    setBusy(true); setErr(null); setNotice(null);
    try { await fn(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  // --- Step 1: create profile ---
  const doCreateProfile = () => wrap(async () => {
    const p = await createArtistProfile({ stageName, bio });
    setProfile(p);
    setActiveStep(1);
  });

  // --- Step 2: create album ---
  const doCreateAlbum = () => wrap(async () => {
    const a = await createAlbum({ title: albumTitle, isSingle });
    setAlbum(a);
    setActiveStep(2);
  });

  // --- Step 3: upload song ---
  const doUpload = () => wrap(async () => {
    if (!file) throw new Error('Choose an audio file first.');
    const s = await uploadSong({
      title: songTitle,
      albumId: album.id,
      durationSeconds,
      genreIds: selectedGenres,
      file,
    });
    setSong(s);
    setActiveStep(3);
  });

  // --- Step 4: publish both album and song ---
  const doPublish = () => wrap(async () => {
    // Album first, then song. Both must be 'published' for the song to appear
    // on Browse (catalog filters status='published' on the song).
    await setAlbumStatus(album.id, 'published');
    await setSongStatus(song.id, 'published');
    setNotice('Published! This song is now live on Browse. Upload another below.');
  });

  // Reset back to the album step to add another song under a fresh album.
  const uploadAnother = () => {
    setAlbum(null); setSong(null);
    setAlbumTitle(''); setIsSingle(false);
    setSongTitle(''); setDurationSeconds(''); setFile(null); setSelectedGenres([]);
    setNotice(null); setErr(null);
    setActiveStep(1);
  };

  const toggleGenre = (id) =>
    setSelectedGenres((cur) =>
      cur.includes(id) ? cur.filter((g) => g !== id) : [...cur, id]
    );

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Artist Studio</Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }}>{notice}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        {/* STEP 1 — PROFILE */}
        {activeStep === 0 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Create your artist profile</Typography>
            <TextField label="Stage name" value={stageName}
              onChange={(e) => setStageName(e.target.value)} required fullWidth />
            <TextField label="Bio (optional)" value={bio}
              onChange={(e) => setBio(e.target.value)} multiline rows={3} fullWidth />
            <Button variant="contained" onClick={doCreateProfile}
              disabled={busy || !stageName.trim()}
              startIcon={busy ? <CircularProgress size={18} /> : null}>
              Create profile
            </Button>
          </Stack>
        )}

        {/* STEP 2 — ALBUM */}
        {activeStep === 1 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Create an album {profile && <>for {profile.stageName}</>}
            </Typography>

            {profile && !profile.isVerified && (
              <Alert severity="warning">
                Your profile isn’t verified yet. Albums require a verified profile — flip
                <code> is_verified = 1 </code> for artist_profile id <b>{profile.id}</b> in the DB,
                then continue.
              </Alert>
            )}

            <TextField label="Album title" value={albumTitle}
              onChange={(e) => setAlbumTitle(e.target.value)} required fullWidth />
            <TextField select label="Type" value={isSingle ? 'single' : 'album'}
              onChange={(e) => setIsSingle(e.target.value === 'single')} fullWidth>
              <MenuItem value="album">Album</MenuItem>
              <MenuItem value="single">Single</MenuItem>
            </TextField>
            <Button variant="contained" onClick={doCreateAlbum}
              disabled={busy || !albumTitle.trim()}
              startIcon={busy ? <CircularProgress size={18} /> : null}>
              Create album
            </Button>
          </Stack>
        )}

        {/* STEP 3 — UPLOAD */}
        {activeStep === 2 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Upload a song to “{album?.title}”
            </Typography>
            <TextField label="Song title" value={songTitle}
              onChange={(e) => setSongTitle(e.target.value)} required fullWidth />
            <TextField label="Duration in seconds (optional)" type="number"
              value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} fullWidth />

            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Genres</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {genres.map((g) => (
                  <Chip key={g.id} label={g.name}
                    color={selectedGenres.includes(g.id) ? 'primary' : 'default'}
                    variant={selectedGenres.includes(g.id) ? 'filled' : 'outlined'}
                    onClick={() => toggleGenre(g.id)} />
                ))}
              </Stack>
            </Box>

            <Button component="label" variant="outlined" startIcon={<UploadFileRoundedIcon />}>
              {file ? file.name : 'Choose audio file'}
              <input type="file" hidden accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </Button>

            <Button variant="contained" onClick={doUpload}
              disabled={busy || !songTitle.trim() || !file}
              startIcon={busy ? <CircularProgress size={18} /> : null}>
              Upload song
            </Button>
          </Stack>
        )}

        {/* STEP 4 — PUBLISH */}
        {activeStep === 3 && (
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Publish</Typography>
            <Typography variant="body2" color="text.secondary">
              “{song?.title}” and its album are still drafts. Publishing makes them
              visible to listeners on Browse.
            </Typography>
            {!notice ? (
              <Button variant="contained" color="success" onClick={doPublish}
                disabled={busy}
                startIcon={busy ? <CircularProgress size={18} /> : <CheckCircleRoundedIcon />}>
                Publish album & song
              </Button>
            ) : (
              <>
                <Divider />
                <Button variant="outlined" onClick={uploadAnother}>Upload another song</Button>
              </>
            )}
          </Stack>
        )}
      </Paper>
    </Box>
  );
}