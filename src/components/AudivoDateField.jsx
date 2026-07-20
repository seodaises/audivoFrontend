import { useState } from 'react';
import { TextField, Popover, InputAdornment, IconButton, Box } from '@mui/material';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import AudivoCalendar from './AudivoCalendar';

const parseYMD = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toYMD = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const pretty = (d) =>
  d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export default function AudivoDateField({
  label, value, onChange, minDate = null, maxDate = null,
  fullWidth = true, helperText,
}) {
  const [anchor, setAnchor] = useState(null);
  const selectedDate = parseYMD(value);

  const open = (e) => setAnchor(e.currentTarget);
  const close = () => setAnchor(null);

  const handlePick = (date) => {
    if (onChange) onChange(toYMD(date));
    close();
  };

  return (
    <>
      <TextField
        label={label}
        fullWidth={fullWidth}
        helperText={helperText}
        value={selectedDate ? pretty(selectedDate) : ''}
        placeholder="Select a date"
        onClick={open}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton edge="end" size="small" onClick={open} aria-label="Open calendar">
                  <CalendarMonthRoundedIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
            sx: { cursor: 'pointer' },
          },
        }}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { p: 2, width: 300, borderRadius: 3 } } }}
      >
        <Box>
          <AudivoCalendar
            value={selectedDate}
            onChange={handlePick}
            minDate={minDate}
            maxDate={maxDate}
          />
        </Box>
      </Popover>
    </>
  );
}