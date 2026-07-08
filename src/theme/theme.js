import { createTheme } from '@mui/material/styles';

// Audivo brand amber — tuned per mode so it stays legible on each background.
const AMBER_LIGHT = '#B5651D'; // deeper amber, reads on light surfaces
const AMBER_DARK  = '#E0983F'; // warmed amber, reads on dark surfaces

export const getTheme = (mode) =>
  createTheme({
    palette: {
      mode, // 'light' | 'dark' — MUI picks sensible defaults from this
      primary: { main: mode === 'light' ? AMBER_LIGHT : AMBER_DARK },
      ...(mode === 'dark'
        ? { background: { default: '#121212', paper: '#1e1e1e' } } // near-black, Spotify-ish
        : { background: { default: '#faf9f7', paper: '#ffffff' } }),// warm off-white
    },
    shape: { borderRadius: 12 }, // soft modern corners everywhere
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      button: { textTransform: 'none', fontWeight: 600 }, // no SHOUTY buttons
    },
    components: {
      MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  });