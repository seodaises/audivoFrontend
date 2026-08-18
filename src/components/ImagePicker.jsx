import { useRef, useState } from 'react';
import {
  Box, Stack, Avatar, Button, TextField, Typography, Alert, CircularProgress,
} from '@mui/material';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { validateImageFile } from '../api/uploads';

export default function ImagePicker({
  label,
  value,
  onChange,
  uploadFn,          // async (file) => url — one of the uploadXImage functions from api/uploads.js
  shape = 'square',   // 'circle' for avatars, 'square' for covers
  disabled = false,
  helperText = 'Upload an image, or paste a link below',
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const pickFile = () => inputRef.current?.click();

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = ''; // allow re-picking the same file later
    if (!file) return;

    setUploadError(null);
    try {
      validateImageFile(file); // instant type/size feedback before spending a round trip
    } catch (err) {
      setUploadError(err.message);
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFn(file);
      onChange(url);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', mb: 1 }}>
        <Avatar
          variant={shape === 'circle' ? 'circular' : 'rounded'}
          src={value || undefined}
          sx={{ width: 72, height: 72, bgcolor: 'action.hover' }}
        >
        </Avatar>

        <Stack spacing={0.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={uploading ? <CircularProgress size={16} /> : <UploadFileRoundedIcon />}
            onClick={pickFile}
            disabled={disabled || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload image'}
          </Button>
          <Typography variant="caption" color="text.secondary">
            JPEG, PNG, or WebP — up to 5 MB
          </Typography>
        </Stack>

        <input
          ref={inputRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChosen}
        />
      </Stack>

      {uploadError && <Alert severity="error" sx={{ mb: 1 }}>{uploadError}</Alert>}

      <TextField
        fullWidth
        size="small"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://…"
        helperText={helperText}
        disabled={disabled}
      />
    </Box>
  );
}