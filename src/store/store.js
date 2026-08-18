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
import playerReducer from './slices/playerSlice';
import notificationsReducer from './slices/notificationsSlice';

const persistConfig = {
  key: 'audivo',
  storage,
  whitelist: ['colorMode', 'sidebar'], // <- auth deliberately excluded
};

const rootReducer = combineReducers({
  colorMode: colorModeReducer,
  sidebar: sidebarReducer,
  auth: authReducer,
  player: playerReducer,
  notifications: notificationsReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);