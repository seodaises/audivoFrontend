import { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../theme/theme';

const ColorModeContext = createContext({ mode: 'dark', toggle: () => {} });

// Any component can do: const { mode, toggle } = useColorMode();
export const useColorMode = () => useContext(ColorModeContext);

export function ColorModeProvider({ children }) {
  const [mode, setMode] = useState(
    () => localStorage.getItem('audivo-mode') || 'dark' // default: dark
  );

  const toggle = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('audivo-mode', next); // persist across refreshes
      return next;
    });
  };

  // Rebuild the theme ONLY when mode changes (useMemo = don't redo work).
  const theme = useMemo(() => getTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={{ mode, toggle }}>
      <ThemeProvider theme={theme}>
        <CssBaseline /> {/* resets browser defaults + paints our background */}
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}