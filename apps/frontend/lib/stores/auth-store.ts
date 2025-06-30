import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AuthStore, User } from './types';
import { API_CONFIG } from '../config';
import { getCookie } from '../CSRFTOKEN';

const initialState = {
  user: null,
  loading: true,
  isAuthenticated: false,
  error: null,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Basic setters
      setUser: (user: User | null) =>
        set((state) => {
          state.user = user;
          state.isAuthenticated = !!user;
        }),

      setLoading: (loading: boolean) =>
        set((state) => {
          state.loading = loading;
        }),

      setError: (error: string | null) =>
        set((state) => {
          state.error = error;
        }),

      clearError: () =>
        set((state) => {
          state.error = null;
        }),

      // Auth methods
      requestNonce: async (walletAddress: string): Promise<string> => {
        try {
          set((state) => {
            state.error = null;
          });

          const csrfToken = await getCookie();

          const res = await fetch(`${API_CONFIG.baseUrl}/auth/request-nonce`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({ walletAddress }),
          });

          if (!res.ok) {
            throw new Error('Failed to request nonce');
          }

          const { nonce } = await res.json();
          return nonce;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to request nonce';
          set((state) => {
            state.error = errorMessage;
          });
          throw error;
        }
      },

      verifySignature: async (walletAddress: string, signature: string): Promise<void> => {
        try {
          set((state) => {
            state.loading = true;
            state.error = null;
          });

          const csrfToken = await getCookie();
          const res = await fetch(`${API_CONFIG.baseUrl}/auth/verify-signature`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({ walletAddress, signature }),
          });

          if (!res.ok) {
            throw new Error('Verification failed');
          }

          const { user } = await res.json();
          set((state) => {
            state.user = user;
            state.isAuthenticated = true;
            state.loading = false;
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Verification failed';
          set((state) => {
            state.error = errorMessage;
            state.loading = false;
          });
          throw error;
        }
      },

      logout: async (): Promise<void> => {
        try {
          set((state) => {
            state.loading = true;
            state.error = null;
          });

          const csrfToken = await getCookie();

          await fetch(`${API_CONFIG.baseUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
          });

          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.loading = false;
          });

          // Redirect to login (this could be handled by the component)
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login';
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Logout failed';
          set((state) => {
            state.error = errorMessage;
            state.loading = false;
          });
          throw error;
        }
      },
    })),
    {
      name: 'auth-store',
    }
  )
);

// Initialize auth state (equivalent to the useEffect in auth-context)
export const initializeAuth = async () => {
  const { setUser, setLoading, setError } = useAuthStore.getState();

  try {
    setLoading(true);
    setError(null);

    const csrfRes = await fetch(`${API_CONFIG.baseUrl}/auth/csrf-token`, {
      credentials: 'include',
    });

    if (!csrfRes.ok) {
      console.error('Failed to fetch CSRF token');
      setLoading(false);
      return;
    }

    const { csrfToken } = await csrfRes.json();

    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/auth/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });

      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  } catch (error) {
    console.error('Error in auth check:', error);
    setError('Authentication initialization failed');
  } finally {
    setLoading(false);
  }
};

// Hook for easier auth state access
export const useAuth = () => {
  const {
    user,
    loading,
    isAuthenticated,
    error,
    requestNonce,
    verifySignature,
    logout,
    clearError,
  } = useAuthStore();

  return {
    user,
    loading,
    isAuthenticated,
    error,
    requestNonce,
    verifySignature,
    logout,
    clearError,
  };
}; 