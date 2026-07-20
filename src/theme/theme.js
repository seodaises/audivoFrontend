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
      MuiCssBaseline: {
        styleOverrides: (themeParam) => {
          const dark = themeParam.palette.mode === 'dark';
          const amber = themeParam.palette.primary.main;
          const track = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
          const thumb = dark ? 'rgba(224,152,63,0.35)' : 'rgba(181,101,29,0.30)';
          const gutter = themeParam.palette.background.default;

          const bar = {
            '&::-webkit-scrollbar': { width: 12, height: 12 },
            '&::-webkit-scrollbar-track': { background: track, borderRadius: 999 },
            '&::-webkit-scrollbar-thumb': {
              background: thumb,
              borderRadius: 999,
              border: `3px solid ${gutter}`,
              backgroundClip: 'padding-box',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: amber,
              backgroundClip: 'padding-box',
            },
          };

          return {
            // Firefox — thin + amber, inherited by every scroll container.
            '*': { scrollbarWidth: 'thin', scrollbarColor: `${thumb} ${track}` },
            // WebKit — declare on html, body, and universally so every overflow
            // container picks it up, not just the main page scrollbar. html/body
            // also carry the Firefox properties.
            'html': { scrollbarWidth: 'thin', scrollbarColor: `${thumb} ${track}`, ...bar },
            'body': bar,
            '*::-webkit-scrollbar': { width: 12, height: 12 },
            '*::-webkit-scrollbar-track': { background: track, borderRadius: 999 },
            '*::-webkit-scrollbar-thumb': {
              background: thumb,
              borderRadius: 999,
              border: `3px solid ${gutter}`,
              backgroundClip: 'padding-box',
            },
            '*::-webkit-scrollbar-thumb:hover': {
              background: amber,
              backgroundClip: 'padding-box',
            },
          };
        },
      },
    },
  });