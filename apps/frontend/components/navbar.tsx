"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ModernSearchInput } from "./ui/modern-search-input";
import { Menu, X, Compass, ShoppingBag, Users, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import ConnectWallet from "./ConnectWallet";
import { UserDropdown } from "./user-dropdown";
import { useAuth } from "@/lib/stores/auth-store";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isAuthenticated, loading } = useAuth();

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
  bg-[#181359] shadow-md border-b border-purple-500/20 contain-layout`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-8 lg:px-12">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center min-h-[48px] min-w-[48px]"
            tabIndex={0}
            aria-label="Home"
          >
            <Image
              src="/nftopia-04.svg"
              alt="NFTopia Logo"
              width={0}
              height={0}
              sizes="(max-width: 576px) 100px, (max-width: 992px) 120px, 140px"
              className="h-auto w-[clamp(80px,10vw,140px)] object-contain"
              priority
            />
          </Link>
          {/* Center nav links - desktop only */}
          <div className="hidden lg:flex flex-1 items-center justify-center space-x-8">
            <Link
              href="/explore"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5 min-h-[48px] min-w-[48px]"
            >
              {" "}
              <Compass className="h-4 w-4" /> Explore{" "}
            </Link>
            <Link
              href="/marketplace"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5 min-h-[48px] min-w-[48px]"
            >
              {" "}
              <ShoppingBag className="h-4 w-4" /> Marketplace{" "}
            </Link>
            <Link
              href="/artists"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5 min-h-[48px] min-w-[48px]"
            >
              {" "}
              <Users className="h-4 w-4" /> Artists{" "}
            </Link>
            <Link
              href="/vault"
              className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5 min-h-[48px] min-w-[48px]"
            >
              {" "}
              <Lock className="h-4 w-4" /> Vault{" "}
            </Link>
          </div>
          {/* Right Side - Search & Auth */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:block">
              <ModernSearchInput
                placeholder="Search"
                className="w-[clamp(120px,20vw,220px)]"
              />
            </div>
            {/* Conditional Auth Component */}
            {!loading &&
              (isAuthenticated ? <UserDropdown /> : <ConnectWallet />)}
            {/* Hamburger menu only on mobile */}
            <button
              className="lg:hidden flex items-center justify-center p-2 rounded-full bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 min-h-[48px] min-w-[48px] focus:outline-none focus:ring-2 focus:ring-purple-400"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              tabIndex={0}
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
        id="mobile-menu"
        className={`lg:hidden transition-all duration-300 overflow-y-auto ${
          isMenuOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        } bg-glass backdrop-blur-md border-t border-purple-500/20`}
        tabIndex={isMenuOpen ? 0 : -1}
        aria-hidden={!isMenuOpen}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="px-2 sm:px-4 py-4 space-y-4">
          <div className="flex flex-col space-y-4">
            <Link
              href="/explore"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2 min-h-[48px] min-w-[48px]"
              onClick={() => setIsMenuOpen(false)}
            >
              {" "}
              <Compass className="h-5 w-5" /> Explore{" "}
            </Link>
            <Link
              href="/marketplace"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2 min-h-[48px] min-w-[48px]"
              onClick={() => setIsMenuOpen(false)}
            >
              {" "}
              <ShoppingBag className="h-5 w-5" /> Marketplace{" "}
            </Link>
            <Link
              href="/artists"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2 min-h-[48px] min-w-[48px]"
              onClick={() => setIsMenuOpen(false)}
            >
              {" "}
              <Users className="h-5 w-5" /> Artists{" "}
            </Link>
            <Link
              href="/vault"
              className="text-sm font-medium py-2 hover:text-purple-400 transition-colors flex items-center gap-2 min-h-[48px] min-w-[48px]"
              onClick={() => setIsMenuOpen(false)}
            >
              {" "}
              <Lock className="h-5 w-5" /> Vault{" "}
            </Link>
          </div>
          {/* Mobile Search */}
          <div className="mt-4">
            <ModernSearchInput placeholder="Search" />
          </div>
          {/* Mobile Auth Actions */}
          <div className="mt-4">
            {!loading &&
              (isAuthenticated ? (
                <div className="space-y-2">
                  <Link
                    href="/creator-dashboard"
                    className="block w-full text-center rounded-full px-6 py-2 bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white hover:opacity-90 min-h-[48px] min-w-[48px]"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </div>
              ) : (
                <Button
                  className="w-full rounded-full px-6 py-2 bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white hover:opacity-90 min-h-[48px] min-w-[48px]"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Register
                </Button>
              ))}
          </div>
        </div>
      </div>
    </header>
  );
}
