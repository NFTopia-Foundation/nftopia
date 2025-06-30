// Types
export * from './types';

// Auth Store
export { useAuthStore, initializeAuth, useAuth } from './auth-store';

// Collection Store
export { useCollectionStore, useCollections } from './collection-store';

// Preferences Store
export {
  usePreferencesStore,
  useTheme,
  useNotifications,
  useDisplaySettings,
  useFavorites,
  useWatchlist,
  useRecentSearches,
  usePreferences,
} from './preferences-store';

// App Store
export {
  useAppStore,
  useOnlineStatus,
  useSidebar,
  useModals,
  useToast,
  useSearch,
  useAppState,
} from './app-store';

import { initializeAuth } from './auth-store';

// Store initialization helper
export const initializeStores = async () => {
  try {
    await initializeAuth();
  } catch (error) {
    console.error('Failed to initialize stores:', error);
  }
}; 