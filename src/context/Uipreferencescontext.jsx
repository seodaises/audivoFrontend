import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'audivo-sidebar-hidden';

const UIPreferencesContext = createContext({
  sidebarHidden: false,
  toggleSidebar: () => {},
  setSidebarHidden: () => {},
});

export const useUIPreferences = () => useContext(UIPreferencesContext);

export function UIPreferencesProvider({ children }) {
  const [sidebarHidden, setSidebarHiddenState] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true' // default: visible
  );

  const persist = useCallback((next) => {
    setSidebarHiddenState(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  const toggleSidebar = useCallback(() => {
    persist(!(localStorage.getItem(STORAGE_KEY) === 'true'));
  }, [persist]);

  const setSidebarHidden = useCallback((v) => persist(!!v), [persist]);

  return (
    <UIPreferencesContext.Provider
      value={{ sidebarHidden, toggleSidebar, setSidebarHidden }}
    >
      {children}
    </UIPreferencesContext.Provider>
  );
}