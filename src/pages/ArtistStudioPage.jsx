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
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import MusicNoteRoundedIcon from '@mui/icons-material/MusicNoteRounded';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import DriveFileRenameOutlineRoundedIcon from '@mui/icons-material/DriveFileRenameOutlineRounded';
import ScheduleSendRoundedIcon from '@mui/icons-material/ScheduleSendRounded';
import {
  createArtistProfile, getMyArtistProfile, createAlbum, setAlbumStatus,
  scheduleRelease, uploadSong, setSongStatus, fetchGenres,
} from '../api/catalog';
import AudivoCalendar from '../components/AudivoCalendar';
import AudivoTimeSelect from '../components/AudivoTimeSelect';

const STEPS = ['Artist profile', 'Album details', 'Add tracks', 'Review & create'];

const fmtDuration = (secs) => {
  if (secs == null) return '';
  const m = Math.floor(secs / 60);
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};


const todayISOFromDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

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

function SortableTrackRow({
  track, index, genres, draggable, onUpdate, onRemove, fmtDuration,
}) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: track.key, disabled: !draggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <ListItem
      ref={setNodeRef}
      style={style}
      disableGutters
      sx={{
        borderBottom: 1, borderColor: 'divider', py: 2, alignItems: 'flex-start',
        bgcolor: isDragging ? 'action.hover' : 'transparent',
      }}
      secondaryAction={
        <Tooltip title="Remove">
          <IconButton edge="end" onClick={() => onRemove(track.key)}>
            <DeleteOutlineRoundedIcon />
          </IconButton>
        </Tooltip>
      }
    >
      <Stack direction="row" spacing={1} sx={{ width: '100%', pr: 5 }}>
        {draggable && (
          <Box
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder track"
            sx={{
              cursor: 'grab', display: 'flex', alignItems: 'center',
              color: 'text.disabled', touchAction: 'none',
              '&:active': { cursor: 'grabbing' },
            }}
          >
            <DragIndicatorRoundedIcon />
          </Box>
        )}

        <Box sx={{ width: '100%' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
            <TextField
              label={`Track ${index + 1} title`}
              value={track.title}
              onChange={(e) => onUpdate(track.key, { title: e.target.value })}
              size="small" sx={{ flexGrow: 1 }}
            />
            <Chip size="small" variant="outlined"
              label={track.durationSeconds != null ? fmtDuration(track.durationSeconds) : 'duration ?'} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
            sx={{ mt: 1.5, alignItems: { sm: 'center' } }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Genre</InputLabel>
              <Select
                label="Genre"
                value={track.genreIds[0] || ''}
                onChange={(e) => onUpdate(track.key, { genreIds: e.target.value ? [e.target.value] : [] })}
              >
                <MenuItem value="">None</MenuItem>
                {genres.map((g) => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch checked={track.publish}
                onChange={(e) => onUpdate(track.key, { publish: e.target.checked })} />}
              label={track.publish ? 'Publish' : 'Save as draft'}
            />
            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
              {track.file.name}
            </Typography>
          </Stack>
        </Box>
      </Stack>
    </ListItem>
  );
}

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

  const [tracks, setTracks] = useState([]);
  const [genres, setGenres] = useState([]);
  const fileInputRef = useRef(null);

  // progress during the final create
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const [releaseMode, setReleaseMode] = useState('publish');

  const seedSchedule = () => {
    const d = new Date(Date.now() + 60 * 60000);
    d.setMinutes(d.getMinutes() <= 30 ? 30 : 0, 0, 0);
    if (d.getMinutes() === 0 && d.getTime() < Date.now()) d.setHours(d.getHours() + 1);
    return d;
  };
  const [scheduleDate, setScheduleDate] = useState(() => {
    const d = seedSchedule();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  });
  const [scheduleTime, setScheduleTime] = useState(() => {
    const d = seedSchedule();
    return `${String(d.getHours()).padStart(2, '0')}:${d.getMinutes() < 30 ? '00' : '30'}`;
  });

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


  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onTrackDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setTracks((prev) => {
      const from = prev.findIndex((t) => t.key === active.id);
      const to = prev.findIndex((t) => t.key === over.id);
      if (from === -1 || to === -1) return prev;
      return arrayMove(prev, from, to);
    });
  };

  // --- Final create: album + all tracks, each with its chosen status ---
  const doCreateEverything = () => wrap(async () => {
    if (!albumTitle.trim()) throw new Error('Album title is required.');
    if (tracks.length === 0) throw new Error('Add at least one track.');
    if (isSingle && tracks.length > 1) {
      throw new Error('A single can only have one track. Remove the extra tracks or turn off "single".');
    }

    // If scheduling, combine the chosen calendar day + time slot into one instant
    // and validate it's genuinely in the future BEFORE we upload anything.
    let scheduleInstant = null;
    if (releaseMode === 'schedule') {
      if (!scheduleDate || !scheduleTime) {
        throw new Error('Pick a date and time to schedule the release.');
      }
      const [h, m] = scheduleTime.split(':').map(Number);
      const when = new Date(
        scheduleDate.getFullYear(), scheduleDate.getMonth(), scheduleDate.getDate(),
        h, m, 0, 0,
      );
      if (Number.isNaN(when.getTime())) throw new Error('That release date/time is not valid.');
      if (when.getTime() <= Date.now() + 60000) {
        throw new Error('The scheduled time must be at least a minute in the future.');
      }
      scheduleInstant = when.toISOString(); // -> UTC ISO, timezone-safe for the server
    }

    const effectiveReleaseDate =
      releaseMode === 'schedule'
        ? todayISOFromDate(scheduleDate)
        : releaseMode === 'publish'
          ? todayISO()
          : null;

    // 1. Create the album. It starts as a draft server-side.
    const album = await createAlbum({
      title: albumTitle.trim(),
      coverUrl: coverUrl.trim() || null,
      description: albumDescription.trim() || null,
      releaseDate: effectiveReleaseDate,
      isSingle,
    });

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

    const anyPublished = publishing && tracks.some((t) => t.publish);
    if (anyPublished) {
      await setAlbumStatus(album.id, 'published');
    }

    if (releaseMode === 'schedule') {
      await scheduleRelease(album.id, scheduleInstant);
    }

    const scheduledPretty = scheduleInstant
      ? new Date(scheduleInstant).toLocaleString(undefined, {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        })
      : '';

    setNotice(
      releaseMode === 'schedule'
        ? `Album "${album.title}" scheduled to go live on ${scheduledPretty}. It stays a private, editable draft until then.`
        : !publishing
          ? `Album "${album.title}" saved as a draft — publish it anytime from your Library.`
          : anyPublished
            ? `Album "${album.title}" published — ${tracks.filter((t) => t.publish).length} track(s) live, the rest saved as drafts.`
            : `Album "${album.title}" created with all tracks saved as drafts.`
    );

    // Reset for a fresh album.
    setAlbumTitle(''); setAlbumDescription(''); setCoverUrl(''); setIsSingle(false);
    setTracks([]); setProgress({ done: 0, total: 0 });
    setReleaseMode('publish');
    const s = seedSchedule();
    setScheduleDate(new Date(s.getFullYear(), s.getMonth(), s.getDate()));
    setScheduleTime(`${String(s.getHours()).padStart(2, '0')}:${s.getMinutes() < 30 ? '00' : '30'}`);
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
            <>
              {tracks.length > 1 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Drag the handle to set the track order — that's the order they'll be saved in.
                </Typography>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onTrackDragEnd}
              >
                <SortableContext
                  items={tracks.map((t) => t.key)}
                  strategy={verticalListSortingStrategy}
                >
                  <List disablePadding>
                    {tracks.map((t, idx) => (
                      <SortableTrackRow
                        key={t.key}
                        track={t}
                        index={idx}
                        genres={genres}
                        draggable={tracks.length > 1}
                        onUpdate={updateTrack}
                        onRemove={removeTrack}
                        fmtDuration={fmtDuration}
                      />
                    ))}
                  </List>
                </SortableContext>
              </DndContext>
            </>
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
                {releaseMode === 'schedule'
                  ? `Releases ${fmtDate(todayISOFromDate(scheduleDate))}`
                  : releaseMode === 'publish'
                    ? 'Releases today'
                    : 'No release date until published'}
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
            <ToggleButton value="schedule" sx={{ textTransform: 'none', px: 2 }}>
              <ScheduleSendRoundedIcon sx={{ fontSize: 18, mr: 1 }} />
              Schedule
            </ToggleButton>
          </ToggleButtonGroup>

          {releaseMode === 'schedule' && (
            <Paper variant="outlined" sx={{ p: 2, mb: 1, borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}
                sx={{ alignItems: { sm: 'flex-start' } }}>
                <Box sx={{ flex: '0 0 auto', width: { xs: '100%', sm: 280 } }}>
                  <AudivoCalendar
                    value={scheduleDate}
                    onChange={setScheduleDate}
                    minDate={new Date()}
                  />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                  <Typography variant="caption" color="text.secondary"
                    sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                    Time (30-minute slots)
                  </Typography>
                  <AudivoTimeSelect
                    value={scheduleTime}
                    onChange={setScheduleTime}
                    label="Release time"
                  />
                  <Typography variant="caption" color="text.secondary"
                    sx={{ display: 'block', mt: 1.5 }}>
                    Uses your local time. Publishes automatically at the selected slot.
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            {releaseMode === 'publish'
              ? `Goes live now. ${publishCount} of ${tracks.length} track(s) will publish; the rest stay draft.`
              : releaseMode === 'schedule'
                ? 'Nothing goes public yet. The album and its tracks are saved privately and publish automatically at the time above — you can keep editing until then.'
                : 'Nothing goes public. The album and every track are saved as drafts — publish anytime from your Library.'}
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="text" onClick={() => setActiveStep(2)} disabled={busy}>Back</Button>
            <Button variant="contained" color={releaseMode === 'draft' ? 'inherit' : 'primary'}
              onClick={doCreateEverything} disabled={busy}>
              {busy
                ? <CircularProgress size={22} />
                : releaseMode === 'draft' ? 'Save draft'
                  : releaseMode === 'schedule' ? 'Schedule release'
                    : 'Publish album'}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}