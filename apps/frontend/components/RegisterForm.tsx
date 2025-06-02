"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { connect } from "@argent/get-starknet";
import axios from "axios";

interface FormValues {
  username?: string;
  isArtist: boolean;
}

export default function RegisterForm() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();

  const onConnectWallet = async () => {
    try {
      const starknet = await connect();
      await starknet.enable();
      setWalletAddress(starknet.selectedAddress || null);
    } catch (err) {
      setError("Failed to connect wallet.");
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!walletAddress) {
      setError("Please connect your wallet first.");
      return;
    }

    try {
      await axios.post("/api/register", {
        walletAddress,
        ...data,
      });

      window.location.href = "/dashboard";
    } catch (err) {
      setError("Registration failed. Please try again.");
    }
  };

  return (
    <div className="text-white flex flex-col items-center justify-center min-h-screen px-4">
      <h2 className="text-3xl font-extrabold text-center mb-6">Create Account</h2>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 p-6 bg-[#1a1a40] rounded-xl w-full max-w-md shadow-lg"
      >
        <div>
          <label className="block mb-1">Wallet Address</label>
          <input
            value={walletAddress || ""}
            disabled
            className="w-full p-2 bg-gray-800 rounded"
          />
        </div>

        <div>
          <label className="block mb-1">Username (optional)</label>
          <input
            {...register("username")}
            placeholder="coolcollector123"
            className="w-full p-2 bg-gray-800 rounded"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register("isArtist")}
            className="accent-purple-500"
          />
          <label>I’m an artist/creator</label>
        </div>

        <button
          type="button"
          onClick={onConnectWallet}
          className="bg-gradient-to-br from-[#8989e9] to-[#674984] hover:opacity-90 w-full p-2 rounded text-white transition"
        >
          Connect Wallet
        </button>

        <button
          type="submit"
          disabled={!walletAddress}
          className="bg-gray-600 hover:bg-gray-700 w-full p-2 rounded text-white"
        >
          Complete Registration
        </button>

        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>

      <h6 className="text-sm mt-4">
        Already have an account?{" "}
        <a href="/login" className="underline text-purple-400">
          Sign in
        </a>
      </h6>
      <h6 className="text-xs text-gray-400">100% Starknet Secure</h6>
    </div>
  );
}
