import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
const createLocalStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    };
  }
  return {
    getItem: (key) => Promise.resolve(window.localStorage.getItem(key)),
    setItem: (key, value) => Promise.resolve(window.localStorage.setItem(key, value)),
    removeItem: (key) => Promise.resolve(window.localStorage.removeItem(key)),
  };
};
const storage = createLocalStorage();

import colorModeReducer from './slices/colorModeSlice';
import sidebarReducer from './slices/sidebarSlice';
import authReducer from './slices/authSlice';

// Only UI preferences are persisted. auth is intentionally NOT persisted: the
// session lives in an httpOnly cookie (handled by the browser/backend), and
// the user object is re-fetched from /auth/me on load. Nothing auth-related
// is ever written to localStorage.
const persistConfig = {
  key: 'audivo',
  storage,
  whitelist: ['colorMode', 'sidebar'], // <- auth deliberately excluded
};

const rootReducer = combineReducers({
  colorMode: colorModeReducer,
  sidebar: sidebarReducer,
  auth: authReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches these internal actions with non-serializable
        // payloads; ignoring them silences the (harmless) dev warning.
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

