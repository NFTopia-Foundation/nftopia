"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ModernSearchInput } from "@/components/ui/modern-search-input";
import { Menu, X, Compass, ShoppingBag, Users, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import ConnectWallet from "./ConnectWallet";
import { Search } from "lucide-react";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu when clicking outside or on a link
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        !(event.target as HTMLElement).closest(".mobile-menu-container")
      ) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 
      ${scrolled ? "bg-[#181359]/95 backdrop-blur-sm" : "bg-[#181359]"} 
      shadow-md border-b border-purple-500/20 contain-layout`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <nav className="flex items-center justify-between h-16 md:h-20">
          {/* Logo - Improved responsive sizing */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/nftopia-04.svg"
              alt="NFTopia Logo"
              width={120}
              height={40}
              className="w-auto h-[clamp(1.5rem,5vw,2.5rem)] object-contain"
              priority
            />
          </Link>

          {/* Center Nav Links - Adjusted spacing */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6 mx-4">
            <NavLink href="/explore" icon={<Compass className="h-4 w-4" />}>
              Explore
            </NavLink>
            <NavLink
              href="/marketplace"
              icon={<ShoppingBag className="h-4 w-4" />}
            >
              Marketplace
            </NavLink>
            <NavLink href="/artists" icon={<Users className="h-4 w-4" />}>
              Artists
            </NavLink>
            <NavLink href="/vault" icon={<Lock className="h-4 w-4" />}>
              Vault
            </NavLink>
          </div>

          {/* Right Side - Improved search behavior */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Search - Better responsive behavior */}
            <div className="hidden md:flex items-center">
              <div className="hidden lg:block">
                <ModernSearchInput
                  placeholder="Search NFTs, artists..."
                  className="w-[180px] xl:w-[220px]"
                />
              </div>
              <button
                className="lg:hidden p-2 rounded-md hover:bg-gray-100/10 transition-colors [-webkit-tap-highlight-color:transparent] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9747ff]"
                aria-label="Search"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            <ConnectWallet className="hidden sm:flex" />

            {/* Mobile menu button - Improved styling */}
            <button
              className="md:hidden flex items-center justify-center p-2 rounded-full bg-gray-900/40 backdrop-blur-sm border border-gray-800/50 hover:bg-gray-800/60 transition-colors [-webkit-tap-highlight-color:transparent]"
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

      {/* Mobile Menu - Improved scrolling and positioning */}
      <div
        className={`mobile-menu-container md:hidden transition-all duration-300 overflow-hidden ${
          isMenuOpen
            ? "max-h-[calc(100dvh-4rem)] opacity-100 py-4 px-4 border-t border-purple-500/20"
            : "max-h-0 opacity-0"
        } bg-[#181359] backdrop-blur-md`}
      >
        <div className="flex flex-col space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          <MobileNavLink
            href="/explore"
            icon={<Compass className="h-5 w-5" />}
            onClick={() => setIsMenuOpen(false)}
          >
            Explore
          </MobileNavLink>
          <MobileNavLink
            href="/marketplace"
            icon={<ShoppingBag className="h-5 w-5" />}
            onClick={() => setIsMenuOpen(false)}
          >
            Marketplace
          </MobileNavLink>
          <MobileNavLink
            href="/artists"
            icon={<Users className="h-5 w-5" />}
            onClick={() => setIsMenuOpen(false)}
          >
            Artists
          </MobileNavLink>
          <MobileNavLink
            href="/vault"
            icon={<Lock className="h-5 w-5" />}
            onClick={() => setIsMenuOpen(false)}
          >
            Vault
          </MobileNavLink>

          {/* Mobile Search - Full width */}
          <div className="mt-2">
            <ModernSearchInput placeholder="Search..." className="w-full" />
          </div>

          {/* Mobile Wallet Connect */}
          <div className="mt-4 sm:hidden">
            <ConnectWallet fullWidth />
          </div>

          {/* Mobile Register Button */}
          <div className="px-2">
            <Button
              className="w-full rounded-full px-6 py-3 bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white hover:opacity-90 mt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9747ff] focus-visible:outline-offset-2 "
              onClick={() => setIsMenuOpen(false)}
            >
              Register
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

// Helper component for desktop nav links
const NavLink = ({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Link
    href={href}
    className="text-sm font-medium tracking-wide hover:text-purple-400 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9747ff] focus-visible:outline-offset-2"
  >
    {icon}
    {children}
  </Link>
);

// Helper component for mobile nav links
const MobileNavLink = ({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) => (
  <Link
    href={href}
    className="text-base font-medium py-3 px-3 hover:text-purple-400 transition-colors flex items-center gap-3 rounded-lg hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9747ff] focus-visible:outline-offset-2"
    onClick={onClick}
  >
    {icon}
    {children}
  </Link>
);
