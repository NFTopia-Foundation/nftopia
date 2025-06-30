"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { API_CONFIG } from "./config";
import { getCookie } from "./CSRFTOKEN";

type User = {
  id: string;
  walletAddress: string;
  isArtist?: boolean;
  username?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  requestNonce: (walletAddress: string) => Promise<string>;
  verifySignature: (walletAddress: string, signature: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const csrfRes = await fetch(`${API_CONFIG.baseUrl}/auth/csrf-token`, {
          credentials: "include",
        });
        if (!csrfRes.ok) {
          console.error("Failed to fetch CSRF token");
          setLoading(false);
          return;
        }
        const { csrfToken } = await csrfRes.json();

        try {
          const res = await fetch(`${API_CONFIG.baseUrl}/auth/me`, {
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
          });

          if (res.ok) {
            const userData = await res.json();
            setUser(userData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } catch (error) {
        console.error("Error in auth check:", error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const requestNonce = useCallback(async (walletAddress: string) => {
    const csrfToken = await getCookie();

    const res = await fetch(`${API_CONFIG.baseUrl}/auth/request-nonce`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify({ walletAddress }),
    });
    const { nonce } = await res.json();
    return nonce;
  }, []);

  const verifySignature = useCallback(
    async (walletAddress: string, signature: string) => {
      // The signature is expected to be the output from starknet's signMessage:
      // usually a hex string or a stringified array of felts (check your backend contract)
      const csrfToken = await getCookie();
      const res = await fetch(`${API_CONFIG.baseUrl}/auth/verify-signature`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ walletAddress, signature }),
      });

      if (!res.ok) throw new Error("Verification failed");

      const { user } = await res.json();
      setUser(user);
    },
    []
  );

  const logout = useCallback(async () => {
    const csrfToken = await getCookie();

    await fetch(`${API_CONFIG.baseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
    });
    setUser(null);
    router.push("/login");
  }, [router]);

  const value = {
    user,
    loading,
    requestNonce,
    verifySignature,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context!; // The ! tells TypeScript that context is definitely not null
}
