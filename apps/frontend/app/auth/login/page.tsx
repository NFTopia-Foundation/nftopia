"use client";

import { useAuth } from "@/lib/auth-context";
import { useState } from "react";
import { connect } from "@argent/get-starknet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CircuitBackground } from "@/components/circuit-background";
import Link from "next/link";
import { Wallet, KeyRound, LogIn } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const { requestNonce, verifySignature, loading } = useAuth();
  const [walletAddress, setWalletAddress] = useState("");
  const [nonce, setNonce] = useState("");
  const [connected, setConnected] = useState(false);
  const [signer, setSigner] = useState<any>(null);
  const [error, setError] = useState("");

  const connectWallet = async () => {
    try {
      setError("");
      const connection = await connect({
        modalMode: "neverAsk",
      });

      if (connection && connection.account) {
        setWalletAddress(connection.account.address);
        setSigner(connection.account);
        setConnected(true);
      } else {
        setError("Wallet connection failed. Please try again.");
      }
    } catch (error) {
      console.error("Wallet connection error:", error);
      setError("Failed to connect to Starknet wallet.");
    }
  };

  const getNonce = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }
    try {
      setError("");
      const nonceValue = await requestNonce(walletAddress);
      setNonce(nonceValue);
    } catch (error) {
      console.error("Nonce request failed:", error);
      setError("Failed to get nonce. Please try again.");
    }
  };

  const handleLogin = async () => {
    if (!signer || !walletAddress || !nonce) {
      setError("Please connect your wallet and get a nonce first");
      return;
    }

    try {
      setError("");
      const message = `Sign this message to log in: ${nonce}`;
      const { signature } = await signer.signMessage({
        domain: {
          name: "NFTopia",
          chainId: "SN_GOERLI", // or 'SN_MAIN' depending on the network
          version: "1",
        },
        types: {
          StarknetDomain: [
            { name: "name", type: "felt" },
            { name: "chainId", type: "felt" },
            { name: "version", type: "felt" },
          ],
          Message: [{ name: "message", type: "felt" }],
        },
        primaryType: "Message",
        message: {
          message: message,
        },
      });

      await verifySignature(walletAddress, signature);
    } catch (error) {
      console.error("Signature failed:", error);
      setError("Signing failed. Please try again.");
    }
  };

  return (
    <div className="min-h-screen text-white">
      {/* Circuit Background */}
      <CircuitBackground />

      {/* Main Content */}
      <div className="relative z-10 pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          <div className="border border-purple-500/20 rounded-xl p-8 bg-glass backdrop-blur-md shadow-lg">
            <div className="flex justify-center mb-8">
              <Image
                src="/nftopia-04.svg"
                alt="NFTopia Logo"
                width={200}
                height={60}
                className="h-auto"
              />
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-900/50 text-red-300 rounded-lg border border-red-500/30">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Wallet Address (read-only) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-purple-300">
                  Wallet Address
                </label>
                <Input
                  type="text"
                  value={walletAddress}
                  readOnly
                  placeholder="Connect your wallet to display address"
                  className="w-full bg-gray-800/50 border border-purple-500/20 rounded-lg px-4 py-3 text-sm"
                />
              </div>

              {/* Buttons */}
              <div className="space-y-4">
                {!connected ? (
                  <Button
                    onClick={connectWallet}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
                    disabled={loading}
                  >
                    <Wallet className="mr-2 h-5 w-5" />
                    Connect Starknet Wallet
                  </Button>
                ) : (
                  <>
                    {!nonce ? (
                      <Button
                        onClick={getNonce}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-700 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
                        disabled={loading}
                      >
                        <KeyRound className="mr-2 h-5 w-5" />
                        Get Nonce
                      </Button>
                    ) : (
                      <Button
                        onClick={handleLogin}
                        className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center"
                        disabled={loading}
                      >
                        <LogIn className="mr-2 h-5 w-5" />
                        {loading ? "Signing in..." : "Sign & Login"}
                      </Button>
                    )}
                  </>
                )}
              </div>

              <div className="text-center text-sm text-gray-400 mt-6">
                Don't have an account?{" "}
                <Link
                  href="/auth/register"
                  className="text-purple-400 hover:text-purple-300"
                >
                  Register with Starknet
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
