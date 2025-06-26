"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { connect } from "@argent/get-starknet";
import { API_CONFIG } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircuitBackground } from "@/components/circuit-background";

export default function RegisterPage() {
  const router = useRouter();
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const connectWallet = async () => {
    try {
      setLoading(true);
      const starknet = await connect({
        modalMode: "alwaysAsk", // Shows the wallet selection modal
      });

      if (!starknet || !starknet.isConnected) {
        throw new Error("Wallet not connected");
      }

      const address = await starknet.account.address;

      setWalletAddress(address);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to connect to Starknet wallet.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }

    try {
      setLoading(true);

      // Step 1: Fetch the CSRF token
      const csrfRes = await fetch(`${API_CONFIG.baseUrl}/auth/csrf-token`, {
        credentials: "include",
      });
      if (!csrfRes.ok) {
        throw new Error("Failed to fetch CSRF token");
      }
      const { csrfToken } = await csrfRes.json();

      // Step 2: Make the POST request with CSRF token in headers
      // Only send walletAddress and username as per CreateUserDto
      const requestBody: { walletAddress: string; username?: string } = {
        walletAddress,
      };

      // Only include username if it's not empty
      if (username.trim()) {
        requestBody.username = username.trim();
      }

      const response = await fetch(`${API_CONFIG.baseUrl}/users`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Registration failed");
      }

      const userData = await response.json();
      console.log("Registration successful:", userData);

      // Redirect to login or dashboard after successful registration
      router.push("/auth/login");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-white">
      <CircuitBackground />

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="border border-purple-500/20 rounded-xl p-8 bg-glass backdrop-blur-md shadow-lg">
            <h2 className="text-3xl font-bold mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200">
              Create Account
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-900/50 text-red-300 rounded-lg border border-red-500/30">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Wallet Address
                </label>
                <Input
                  type="text"
                  value={walletAddress}
                  readOnly
                  className="w-full bg-gray-800/50 border border-purple-500/20 rounded-lg px-4 py-3 text-sm"
                  placeholder="Connect your wallet to see address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Username (optional)
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-800/50 border border-purple-500/20 rounded-lg px-4 py-3 text-sm"
                  placeholder="coolcollector123"
                  maxLength={50}
                />
              </div>

              <div className="space-y-4">
                <Button
                  onClick={connectWallet}
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-lg font-medium transition bg-gradient-to-r from-[#4e3bff] to-[#9747ff] hover:opacity-90"
                >
                  {loading && !walletAddress
                    ? "Connecting..."
                    : walletAddress
                    ? "✓ Wallet Connected"
                    : "Connect Wallet"}
                </Button>

                <Button
                  onClick={handleRegister}
                  disabled={loading || !walletAddress}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition ${
                    loading || !walletAddress
                      ? "bg-gray-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#4e3bff] to-[#9747ff] hover:opacity-90"
                  }`}
                >
                  {loading && walletAddress
                    ? "Creating Account..."
                    : "Complete Registration"}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-400">
            <p>
              Already have an account?{" "}
              <a
                href="/auth/login"
                className="text-purple-400 hover:text-purple-300"
              >
                Sign in
              </a>
            </p>
            <p className="mt-2">100% Starknet Secure</p>
          </div>
        </div>
      </div>
    </div>
  );
}
