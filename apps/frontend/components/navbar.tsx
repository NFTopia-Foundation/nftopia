"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ModernSearchInput } from "@/components/ui/modern-search-input";
import { Menu, X, Compass, ShoppingBag, Users, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import ConnectWallet from "./ConnectWallet";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 
      bg-[#181359] shadow-md border-b border-purple-500/20`}
    >
      <div className="max-w-7xl mx-auto px-4">
        <nav className="flex items-center justify-between h-16 md:h-20 relative">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/nftopia-04.svg"
              alt="NFTopia Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>

          
          <div className="hidden md:flex items-center justify-center absolute left-1/2 transform -translate-x-1/2 space-x-8">
            <Link
              href="/explore"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5"
            >
              <Compass className="h-4 w-4" />
              Explore
            </Link>
            <Link
              href="/marketplace"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="h-4 w-4" />
              Marketplace
            </Link>
            <Link
              href="/artists"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5"
            >
              <Users className="h-4 w-4" />
              Artists
            </Link>
            <Link
              href="/vault"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5"
            >
              <Lock className="h-4 w-4" />
              Vault
            </Link>
          </div>

          {/* Rest of the navbar remains unchanged */}
          {/* Right Side - Search & Register */}
          <div className="flex items-center gap-4">
            <div className="hidden md:block">
              <ModernSearchInput
                placeholder="Search"
                className="w-[180px] lg:w-[220px]"
              />
            </div>
            
              <ConnectWallet />

            <button
              className="md:hidden flex items-center justify-center p-2 rounded-full bg-gray-900/40 backdrop-blur-sm border border-gray-800/50"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-white" />
              ) : (
                <Menu className="h-5 w-5 text-white" />
              )}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isMenuOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        } bg-glass backdrop-blur-md border-t border-purple-500/20`}
      >
        <div className="px-4 py-4 space-y-4">
          <div className="flex flex-col space-y-4">
            <Link
              href="/explore"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Compass className="h-5 w-5" />
              Explore
            </Link>
            <Link
              href="/marketplace"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <ShoppingBag className="h-5 w-5" />
              Marketplace
            </Link>
            <Link
              href="/artists"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Users className="h-5 w-5" />
              Artists
            </Link>
            <Link
              href="/vault"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Lock className="h-5 w-5" />
              Vault
            </Link>
          </div>

          {/* Mobile Search */}
          <div className="mt-4">
            <ModernSearchInput placeholder="Search" />
          </div>

          {/* Mobile Register Button */}
          <Button
            className="w-full rounded-full px-6 py-2 bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white hover:opacity-90 mt-4"
            onClick={() => setIsMenuOpen(false)}
          >
            Register
          </Button>
          
        </div>
      </div>
    </header>
  );
}
