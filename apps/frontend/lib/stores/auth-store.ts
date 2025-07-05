import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { AuthStore, User } from './types';
import { API_CONFIG } from '../config';
import { getCookie } from '../CSRFTOKEN';
import { NextRouter } from 'next/router';

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

          const result = await res.json();

          const nonce = result.data.data.nonce;
          console.log(nonce);
          return nonce;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to request nonce';
          set((state) => {
            state.error = errorMessage;
          });
          throw error;
        }
      },
      verifySignature: async (
        walletAddress: string,
        signature: [string, string],
        nonce: string,
        walletType: 'argentx' | 'braavos'
      ) => {
        set({ loading: true });
        try {
          const csrfToken = await getCookie();
          const res = await fetch(`${API_CONFIG.baseUrl}/auth/verify-signature`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
            },
            body: JSON.stringify({
              walletAddress,
              signature,
              nonce,
              walletType,
            }),
          });

          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || 'Verification failed');
          }

          const result = await res.json();

          let user = result.data.data;

          console.log(user);
          localStorage.setItem('auth-user', JSON.stringify({ data: user }));
          set({
            user,
            isAuthenticated: true,
            loading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Verification failed';
          set({ error: message, loading: false });
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


export const initializeAuth = async (router?: NextRouter) => {
  const { setUser, setLoading, setError } = useAuthStore.getState();

  try {
    setLoading(true);
    setError(null);

    const csrfToken = await getCookie();
    
    const res = await fetch(`${API_CONFIG.baseUrl}/auth/me`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
    });

    const result = await res.json();

  

    if (res.ok) {
      const userData = result.data?.data; // Adjust based on your actual response structure
      setUser(userData);

      let currLocation = window.location.href;

      if (currLocation === "http://localhost:5000/auth/login" && userData) window.location.href = "http://localhost:5000/creator-dashboard";
      
  
    } else {
      setUser(null);
    }
  } catch (error) {
    console.error('Error in auth check:', error);
    setError('Authentication initialization failed');
    setUser(null);
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


