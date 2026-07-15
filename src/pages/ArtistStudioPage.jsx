import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Stepper, Step, StepLabel, TextField, Button, Stack,
  Alert, Paper, Chip, MenuItem, CircularProgress, Divider, Switch,
  FormControlLabel, IconButton, List, ListItem, ListItemText, Tooltip,
  LinearProgress, FormControl, InputLabel, Select,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded';
import {
  createArtistProfile, getMyArtistProfile, createAlbum, setAlbumStatus,
  uploadSong, setSongStatus, fetchGenres,
} from '../api/catalog';

const STEPS = ['Artist profile', 'Album details', 'Add tracks', 'Review & create'];

const fmtDuration = (secs) => {
  if (secs == null) return '';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// today's date as YYYY-MM-DD in the user's local timezone — used as the default
// release date for a single when the artist leaves the field blank.
const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

// pretty-print a YYYY-MM-DD string for display (e.g. "12 Mar 2026"). Falls back
// to em dash when there's no date.
const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

// Read an audio file's duration in the browser, no upload needed. We load the
// file into an <audio> element and wait for its metadata; the duration is then
// available. Returns whole seconds, or null if the browser can't decode it.
const readAudioDuration = (file) =>
  new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const secs = Number.isFinite(audio.duration) ? Math.round(audio.duration) : null;
        resolve(secs);
      };
      audio.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      audio.src = url;
    } catch {
      resolve(null);
    }
  });

export default function ArtistStudioPage() {
  const [activeStep, setActiveStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [notice, setNotice] = useState(null);

  const [profile, setProfile] = useState(null);

  // Step 1
  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');

  // Step 2
  const [albumTitle, setAlbumTitle] = useState('');
  const [albumDescription, setAlbumDescription] = useState('');
  const [isSingle, setIsSingle] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [releaseDate, setReleaseDate] = useState('');   // YYYY-MM-DD, optional

  // Step 3 — the track queue. Each entry:
  // { key, title, file, durationSeconds, genreIds, publish (bool) }
  const [tracks, setTracks] = useState([]);
  const [genres, setGenres] = useState([]);
  const fileInputRef = useRef(null);

  // progress during the final create
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Album-level release intent chosen on the review step. 'publish' respects the
  // per-track publish switches and takes the album live; 'draft' overrides
  // everything to keep the whole release private until the artist publishes it
  // later from their Library.
  const [releaseMode, setReleaseMode] = useState('publish');

  useEffect(() => {
    getMyArtistProfile()
      .then((p) => { if (p) { setProfile(p); setActiveStep(1); } })
      .catch(() => {});
    fetchGenres().then(setGenres).catch(() => setGenres([]));
  }, []);

  const wrap = async (fn) => {
    setBusy(true); setErr(null);
    try { await fn(); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const doCreateProfile = () => wrap(async () => {
    const p = await createArtistProfile({ stageName, bio });
    setProfile(p);
    setActiveStep(1);
  });

  // A single is capped at exactly one track. Toggling "single" on while more
  // than one track is already queued would create an invalid state, so we block
  // that toggle and tell the artist to remove tracks first.
  const onToggleSingle = (checked) => {
    if (checked && tracks.length > 1) {
      setErr('A single can only have one track. Remove the extra tracks first, then switch to single.');
      return;
    }
    setErr(null);
    setIsSingle(checked);
  };

  // --- Track queue management ---
  const onPickFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    // Enforce the single cap: a single may hold exactly one track. If the artist
    // already has one queued, or tries to add several at once, we trim to the
    // first and surface why.
    let toAdd = files;
    if (isSingle) {
      if (tracks.length >= 1) {
        setErr('This release is marked as a single — remove the current track before choosing a different one.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      if (files.length > 1) {
        setErr('This release is marked as a single, so only the first file was added.');
        toAdd = [files[0]];
      }
    }

    // Read durations in parallel, then append rows.
    const rows = await Promise.all(
      toAdd.map(async (file) => ({
        key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        title: file.name.replace(/\.[^.]+$/, ''),  // default title from filename
        file,
        durationSeconds: await readAudioDuration(file),
        genreIds: [],
        publish: true,   // default: publish with the album
      }))
    );
    setTracks((prev) => [...prev, ...rows]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateTrack = (key, patch) =>
    setTracks((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));

  const removeTrack = (key) =>
    setTracks((prev) => prev.filter((t) => t.key !== key));

  // --- Final create: album + all tracks, each with its chosen status ---
  const doCreateEverything = () => wrap(async () => {
    if (!albumTitle.trim()) throw new Error('Album title is required.');
    if (tracks.length === 0) throw new Error('Add at least one track.');
    if (isSingle && tracks.length > 1) {
      throw new Error('A single can only have one track. Remove the extra tracks or turn off "single".');
    }

    // A single with no explicit date releases today; a normal album keeps
    // whatever the artist picked (which may be null).
    const effectiveReleaseDate =
      releaseDate.trim() || (isSingle ? todayISO() : null);

    // 1. Create the album. It starts as a draft server-side.
    const album = await createAlbum({
      title: albumTitle.trim(),
      coverUrl: coverUrl.trim() || null,
      description: albumDescription.trim() || null,
      releaseDate: effectiveReleaseDate,
      isSingle,
    });

    // 2. Upload each track in order, then set its status. Uploads default to
    //    'draft' server-side. In 'publish' mode we promote the tracks the artist
    //    toggled on; in 'draft' mode we promote nothing — the whole release stays
    //    private until published later from the Library.
    const publishing = releaseMode === 'publish';
    setProgress({ done: 0, total: tracks.length });
    for (let i = 0; i < tracks.length; i += 1) {
      const t = tracks[i];
      const created = await uploadSong({
        title: t.title.trim() || `Track ${i + 1}`,
        albumId: album.id,
        trackNumber: i + 1,
        durationSeconds: t.durationSeconds,
        genreIds: t.genreIds,
        file: t.file,
      });
      if (publishing && t.publish) {
        await setSongStatus(created.id, 'published');
      }
      setProgress({ done: i + 1, total: tracks.length });
    }

    // 3. Promote the ALBUM itself. Previously this step was missing, so the
    //    songs published but the album was left as a draft — the bug we fixed.
    //    In draft mode we skip this entirely; in publish mode, if any track went
    //    live the album goes live too. The backend cascade re-publishes only
    //    DRAFT songs, so tracks already published above are untouched (idempotent).
    const anyPublished = publishing && tracks.some((t) => t.publish);
    if (anyPublished) {
      await setAlbumStatus(album.id, 'published');
    }

    setNotice(
      !publishing
        ? `Album "${album.title}" saved as a draft — publish it anytime from your Library.`
        : anyPublished
          ? `Album "${album.title}" published — ${tracks.filter((t) => t.publish).length} track(s) live, the rest saved as drafts.`
          : `Album "${album.title}" created with all tracks saved as drafts.`
    );

    // Reset for a fresh album.
    setAlbumTitle(''); setAlbumDescription(''); setCoverUrl(''); setIsSingle(false);
    setReleaseDate(''); setTracks([]); setProgress({ done: 0, total: 0 });
    setReleaseMode('publish');
    setActiveStep(1);
  });

  const canGoToTracks = albumTitle.trim().length > 0;
  const publishCount = tracks.filter((t) => t.publish).length;

  // Once a single already has its one track, the picker is closed.
  const pickerDisabled = isSingle && tracks.length >= 1;

  return (
    <Box sx={{ pb: 12, maxWidth: 780, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Artist Studio</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Create an album, queue up your tracks, and choose which to publish.
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {STEPS.map((label) => (
          <Step key={label}><StepLabel>{label}</StepLabel></Step>
        ))}
      </Stepper>

      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>{err}</Alert>}
      {notice && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>{notice}</Alert>}

      {/* Step 0: profile */}
      {activeStep === 0 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Create your artist profile</Typography>
          <Stack spacing={2}>
            <TextField label="Stage name" value={stageName} onChange={(e) => setStageName(e.target.value)} fullWidth />
            <TextField label="Bio" value={bio} onChange={(e) => setBio(e.target.value)}
              fullWidth multiline minRows={3} />
            <Box>
              <Button variant="contained" onClick={doCreateProfile}
                disabled={busy || !stageName.trim()}>
                {busy ? <CircularProgress size={22} /> : 'Create profile'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Step 1: album details */}
      {activeStep === 1 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Album details</Typography>
          <Stack spacing={2}>
            <TextField label="Album title" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} fullWidth />
            <TextField label="Description" value={albumDescription}
              onChange={(e) => setAlbumDescription(e.target.value)}
              fullWidth multiline minRows={3} placeholder="Tell listeners about this release…" />
            <TextField label="Cover image URL" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)}
              fullWidth placeholder="https://…" />
            <TextField
              type="date"
              label="Release date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText={isSingle
                ? 'Optional — a single with no date is released today.'
                : 'Optional — leave blank if the release date is undecided.'}
            />
            <FormControlLabel
              control={<Switch checked={isSingle} onChange={(e) => onToggleSingle(e.target.checked)} />}
              label="This is a single (one track only)"
            />
            <Box>
              <Button variant="contained" onClick={() => setActiveStep(2)} disabled={!canGoToTracks}>
                Next: add tracks
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      {/* Step 2: track queue */}
      {activeStep === 2 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Add tracks</Typography>
              {isSingle && (
                <Typography variant="caption" color="text.secondary">
                  Single — one track only
                </Typography>
              )}
            </Box>
            <Tooltip title={pickerDisabled ? 'A single already has its track — remove it to choose another' : ''}>
              <span>
                <Button variant="outlined" component="label" startIcon={<UploadFileRoundedIcon />}
                  disabled={pickerDisabled}>
                  Choose audio file{isSingle ? '' : 's'}
                  <input ref={fileInputRef} hidden type="file" accept="audio/*"
                    multiple={!isSingle}
                    onChange={(e) => onPickFiles(e.target.files)} />
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {tracks.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 5, color: 'text.secondary' }}>
              <MusicNoteRoundedIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">
                No tracks yet. Choose {isSingle ? 'an audio file' : 'one or more audio files'} to begin.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {tracks.map((t, idx) => (
                <ListItem key={t.key} disableGutters
                  sx={{ borderBottom: 1, borderColor: 'divider', py: 2, alignItems: 'flex-start' }}
                  secondaryAction={
                    <Tooltip title="Remove">
                      <IconButton edge="end" onClick={() => removeTrack(t.key)}>
                        <DeleteOutlineRoundedIcon />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <Box sx={{ width: '100%', pr: 5 }}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
                      <TextField
                        label={`Track ${idx + 1} title`}
                        value={t.title}
                        onChange={(e) => updateTrack(t.key, { title: e.target.value })}
                        size="small" sx={{ flexGrow: 1 }}
                      />
                      <Chip size="small" variant="outlined"
                        label={t.durationSeconds != null ? fmtDuration(t.durationSeconds) : 'duration ?'} />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
                      sx={{ mt: 1.5, alignItems: { sm: 'center' } }}>
                      <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Genre</InputLabel>
                        <Select
                          label="Genre"
                          value={t.genreIds[0] || ''}
                          onChange={(e) => updateTrack(t.key, { genreIds: e.target.value ? [e.target.value] : [] })}
                        >
                          <MenuItem value="">None</MenuItem>
                          {genres.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <FormControlLabel
                        control={<Switch checked={t.publish}
                          onChange={(e) => updateTrack(t.key, { publish: e.target.checked })} />}
                        label={t.publish ? 'Publish' : 'Save as draft'}
                      />
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                        {t.file.name}
                      </Typography>
                    </Stack>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button variant="text" onClick={() => setActiveStep(1)}>Back</Button>
            <Button variant="contained" onClick={() => setActiveStep(3)} disabled={tracks.length === 0}>
              Next: review
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Step 3: review & create */}
      {activeStep === 3 && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Review & create</Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body1"><strong>{albumTitle}</strong>{isSingle ? ' (single)' : ''}</Typography>
            {albumDescription && (
              <Typography variant="body2" color="text.secondary">{albumDescription}</Typography>
            )}
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', color: 'text.secondary' }}>
              <CalendarMonthRoundedIcon sx={{ fontSize: 16 }} />
              <Typography variant="body2">
                Releases {fmtDate(releaseDate.trim() || (isSingle ? todayISO() : ''))}
                {!releaseDate.trim() && isSingle ? ' (today)' : ''}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {tracks.length} track(s) · {publishCount} to publish · {tracks.length - publishCount} draft(s)
            </Typography>
          </Stack>

          <Divider sx={{ mb: 2 }} />
          <List dense>
            {tracks.map((t, idx) => (
              <ListItem key={t.key} disableGutters>
                <ListItemText
                  primary={`${idx + 1}. ${t.title || `Track ${idx + 1}`}`}
                  secondary={`${fmtDuration(t.durationSeconds)}${t.durationSeconds != null ? ' · ' : ''}${t.publish ? 'will publish' : 'draft'}`}
                />
                <Chip size="small" label={t.publish ? 'publish' : 'draft'}
                  color={t.publish ? 'success' : 'warning'} variant="outlined" />
              </ListItem>
            ))}
          </List>

          {busy && progress.total > 0 && (
            <Box sx={{ my: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Uploading {progress.done} / {progress.total}…
              </Typography>
              <LinearProgress variant="determinate"
                value={progress.total ? (progress.done / progress.total) * 100 : 0} />
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Release intent: publish now (respects the per-track switches) or
              save the whole thing as a draft to publish later from the Library. */}
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
            How do you want to release this?
          </Typography>
          <ToggleButtonGroup
            exclusive
            value={releaseMode}
            onChange={(_, v) => { if (v) setReleaseMode(v); }}
            size="small"
            sx={{ mb: 1 }}
          >
            <ToggleButton value="publish" sx={{ textTransform: 'none', px: 2 }}>
              <PublicRoundedIcon sx={{ fontSize: 18, mr: 1 }} />
              Publish now
            </ToggleButton>
            <ToggleButton value="draft" sx={{ textTransform: 'none', px: 2 }}>
              <DriveFileRenameOutlineRoundedIcon sx={{ fontSize: 18, mr: 1 }} />
              Save as draft
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {releaseMode === 'publish'
              ? `Goes live now. ${publishCount} of ${tracks.length} track(s) will publish; the rest stay draft.`
              : 'Nothing goes public. The album and every track are saved as drafts — publish anytime from your Library.'}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="text" onClick={() => setActiveStep(2)} disabled={busy}>Back</Button>
            <Button variant="contained" color={releaseMode === 'draft' ? 'inherit' : 'primary'}
              onClick={doCreateEverything} disabled={busy}>
              {busy
                ? <CircularProgress size={22} />
                : releaseMode === 'draft' ? 'Save draft' : 'Publish album'}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}