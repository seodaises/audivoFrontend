import { useState } from 'react';
import {
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, CircularProgress,
} from '@mui/material';
import SubtitlesRoundedIcon from '@mui/icons-material/SubtitlesRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import useSongLyrics from '../store/hooks/useSongLyrics';

const fmtTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = String(Math.floor(secs % 60)).padStart(2, '0');
  return `${m}:${s}`;
};

export default function SongLyricsButton({ song, visible, sx }) {
  const [open, setOpen] = useState(false);
  const { loading, available, lines, error } = useSongLyrics(open ? song.id : null);

  return (
    <>
      <Tooltip title="View lyrics">
        <IconButton
          size="small"
          aria-label={`View lyrics for ${song.title}`}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          sx={{
            opacity: visible ? 1 : 0,
            pointerEvents: visible ? 'auto' : 'none',
            transition: 'opacity .18s ease',
            ...sx,
          }}
        >
          <SubtitlesRoundedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {song.title} — lyrics
          <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close">
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error || !available || !lines?.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              Lyrics aren't available for this track yet.
            </Typography>
          ) : (
            lines.map((line, i) => (
              <Typography key={i} variant="body2" sx={{ mb: 0.75 }}>
                <Box component="span" sx={{ color: 'text.disabled', fontSize: 12, mr: 1 }}>
                  {fmtTime(line.time)}
                </Box>
                {line.text}
              </Typography>
            ))
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}