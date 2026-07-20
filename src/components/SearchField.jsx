import { Box, TextField, Typography, InputAdornment, IconButton } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

export default function SearchField({
  value,
  onChange,
  onClear,
  clearable = true,
  placeholder,
  label,
  size = 'small',
  sx,
  fullWidth = false,
  slotProps,
  InputProps,
  inputProps,
  ...rest
}) {
  const handleClear = () => {
    if (onClear) {
      onClear();
      return;
    }
    if (onChange) {
      onChange({ target: { value: '' } });
    }
  };

  const mergedInputProps = {
    ...(inputProps || {}),
    ...(slotProps?.input || {}),
    ...(InputProps || {}),
    startAdornment: InputProps?.startAdornment ?? slotProps?.input?.startAdornment ?? (
      <InputAdornment position="start">
        <SearchRoundedIcon fontSize="small" color="action" />
      </InputAdornment>
    ),
    endAdornment: value && clearable
      ? (
          <>
            {InputProps?.endAdornment}
            {slotProps?.input?.endAdornment}
            <InputAdornment position="end">
              <IconButton size="small" aria-label="clear search" onClick={handleClear}>
                <CloseRoundedIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          </>
        )
      : (InputProps?.endAdornment ?? slotProps?.input?.endAdornment ?? null),
  };

  const mergedSlotProps = {
    ...slotProps,
    input: mergedInputProps,
  };

  return (
    <Box sx={sx}>
      {label && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      <TextField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        size={size}
        fullWidth={fullWidth}
        sx={sx}
        slotProps={mergedSlotProps}
        {...rest}
      />
    </Box>
  );
}
