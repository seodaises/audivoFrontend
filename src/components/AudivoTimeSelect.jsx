import { FormControl, InputLabel, Select, MenuItem } from '@mui/material';

const SLOTS = (() => {
  const out = [];
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const label = new Date(2000, 0, 1, h, m)
        .toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      out.push({ value, label });
    }
  }
  return out;
})();

export default function AudivoTimeSelect({ value, onChange, label = 'Time' }) {
  return (
    <FormControl fullWidth size="small">
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
      >
        {SLOTS.map((s) => (
          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

// Exported so callers can reuse the same slot list / validation if needed.
export { SLOTS };