import { Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h).padStart(2, '0'),
  label: new Date(2000, 0, 1, h, 0).toLocaleTimeString(undefined, { hour: 'numeric' }),
}));

const MINUTES = Array.from({ length: 60 }, (_, m) => ({
  value: String(m).padStart(2, '0'),
  label: String(m).padStart(2, '0'),
}));

export default function AudivoTimeSelect({ value, onChange }) {
  const [hh, mm] = value ? value.split(':') : ['', ''];

  const emit = (nextHh, nextMm) => onChange && onChange(`${nextHh || '00'}:${nextMm || '00'}`);

  return (
    <Stack direction="row" spacing={1.5}>
      <FormControl size="small" sx={{ flex: 1 }}>
        <InputLabel>Hour</InputLabel>
        <Select
          label="Hour"
          value={hh}
          onChange={(e) => emit(e.target.value, mm)}
          MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
        >
          {HOURS.map((h) => (
            <MenuItem key={h.value} value={h.value}>{h.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl size="small" sx={{ flex: 1 }}>
        <InputLabel>Min</InputLabel>
        <Select
          label="Min"
          value={mm}
          onChange={(e) => emit(hh, e.target.value)}
          MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
        >
          {MINUTES.map((m) => (
            <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
}