"use client";

import { Button } from "@/components/ui/button";
// import Image from "next/image";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Vault } from "@/components/Vault";

export function MainHero() {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-center py-12 px-4 md:px-8 lg:px-12 mt-12 md:mt-20">
      <div className="space-y-6 md:w-1/2 pt-4 md:pt-8">
        <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white font-display tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-purple-200 mb-2">
          Decentralized
          <br />
          <span className="text-5xl md:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-[#4e3bff] to-[#9747ff] block mt-1 mb-1">
            NFT Storage
          </span>
          <span className="tracking-tight block mt-1 text-white">
            Management
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-md">
          Securely store, manage, and showcase your unique digital assets on
          Starknet blockchain with unparalleled security and true ownership.
        </p>

        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-r from-[#4e3bff] via-[#9747ff] to-[#6d3bff] hover:opacity-90 rounded-full px-8 py-6 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300"
          >
            Start Creating
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="relative border-2 border-transparent text-white hover:bg-gray-800/30 rounded-full px-8 py-6 group overflow-hidden transition-all duration-300"
          >
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-[#4e3bff] to-[#9747ff] opacity-20 group-hover:opacity-30 transition-opacity"></span>
            <span className="absolute inset-0 rounded-full border-2 border-[#ec796b] opacity-70 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_15px_rgba(236,121,107,0.5)] group-hover:shadow-[0_0_20px_rgba(236,121,107,0.7)]"></span>
            <span className="absolute -inset-px rounded-full bg-[#181359] border border-gray-700"></span>
            <span className="relative z-10 flex items-center">
              <span className="mr-2">Explore NFTs</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="transition-transform group-hover:translate-x-1"
              >
                <path
                  d="M3.33337 8H12.6667"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8 3.33331L12.6667 7.99998L8 12.6666"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-8 max-w-md">
          <div className="relative bg-[#181359]/40 p-4 rounded-xl text-center backdrop-blur-md border border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
            <div className="absolute -left-6 -bottom-6 w-12 h-12 bg-[#ec796b]/10 rounded-full blur-lg group-hover:bg-[#ec796b]/20 transition-all duration-500"></div>
            <svg
              className="absolute opacity-5 -right-4 -bottom-4 w-20 h-20 text-purple-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5"></path>
            </svg>
            <div className="text-2xl font-bold text-white mb-1">100%</div>
            <div className="text-sm text-purple-400 font-medium">On-Chain</div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/50 to-transparent"></div>
          </div>

          <div className="relative bg-[#181359]/40 p-4 rounded-xl text-center backdrop-blur-md border border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
            <div className="absolute -left-6 -bottom-6 w-12 h-12 bg-[#ec796b]/10 rounded-full blur-lg group-hover:bg-[#ec796b]/20 transition-all duration-500"></div>
            <svg
              className="absolute opacity-5 -right-4 -bottom-4 w-20 h-20 text-purple-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-15v5l4.5 2.5"></path>
            </svg>
            <div className="text-2xl font-bold text-white mb-1 truncate">
              Starknet
            </div>
            <div className="text-sm text-purple-400 font-medium">Ecosystem</div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/50 to-transparent"></div>
          </div>

          <div className="relative bg-[#181359]/40 p-4 rounded-xl text-center backdrop-blur-md border border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-300 overflow-hidden group">
            <div className="absolute -right-6 -top-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
            <div className="absolute -left-6 -bottom-6 w-12 h-12 bg-[#ec796b]/10 rounded-full blur-lg group-hover:bg-[#ec796b]/20 transition-all duration-500"></div>
            <svg
              className="absolute opacity-5 -right-4 -bottom-4 w-20 h-20 text-purple-400"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-15v5l4.5 2.5"></path>
            </svg>
            <div className="text-2xl font-bold text-white mb-1">Secure</div>
            <div className="text-sm text-purple-400 font-medium">Storage</div>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/50 to-transparent"></div>
          </div>
        </div>
      </div>

      <div className="md:w-1/2 flex justify-end items-center">
        <div className="relative max-w-xl w-full md:w-[90%] lg:w-[85%] -mt-12 md:-mt-24 lg:-mt-36 md:mr-4 lg:mr-8">
          <div className="relative h-[400px] md:h-[500px] lg:h-[550px] flex items-center justify-center">
            <Vault />
          </div>
        </div>
      </div>
    </div>
  );
}
