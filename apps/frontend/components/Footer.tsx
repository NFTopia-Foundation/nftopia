"use client";
import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Instagram,
  Twitter,
  Mail,
  Youtube,
  ChevronDown,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const Footer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState("English");
  const languageRef = useRef<HTMLDivElement>(null);

  const languages = ["English", "French", "Spanish"];

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageRef.current &&
        !languageRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <footer className="bg-[#181359] text-white py-8 px-4 border-t border-purple-500/20">
      {/* Changed to grid layout with proper breakpoints */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Logo section */}
        <div className="flex flex-col items-center lg:items-start space-y-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/nftopia-04.svg"
              alt="NFTopia Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>

        {/* Navigation Links - now in proper columns */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Link
              href="/sitemap"
              className="text-sm block hover:text-purple-400 transition"
            >
              Sitemap
            </Link>
            <Link
              href="/privacy-policy"
              className="text-sm block hover:text-purple-400 transition"
            >
              Privacy Policy
            </Link>
          </div>
          <div className="space-y-2">
            <Link
              href="/terms-of-service"
              className="text-sm block hover:text-purple-400 transition"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="text-sm block hover:text-purple-400 transition"
            >
              Contact Us
            </Link>
            <Link
              href="/shop"
              className="text-sm block hover:text-purple-400 transition"
            >
              Official Shop
            </Link>
          </div>
        </div>

        {/* Social and Language - now properly aligned */}
        <div className="flex flex-col items-center lg:items-end space-y-4">
          {/* Social Icons with horizontal scroll on mobile */}
          <div className="w-full overflow-x-auto pb-2">
            <div className="flex gap-3 justify-center lg:justify-end min-w-max">
              {[
                {
                  icon: Facebook,
                  href: "https://facebook.com",
                  label: "Facebook",
                },
                {
                  icon: Instagram,
                  href: "https://instagram.com",
                  label: "Instagram",
                },
                {
                  icon: Twitter,
                  href: "https://twitter.com",
                  label: "Twitter",
                },
                {
                  icon: Mail,
                  href: "mailto:support@nftopia.com",
                  label: "Email",
                },
                {
                  icon: Youtube,
                  href: "https://youtube.com",
                  label: "YouTube",
                },
              ].map(({ icon: Icon, href, label }) => (
                <Link
                  key={label}
                  href={href}
                  target="_blank"
                  aria-label={label}
                  className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 hover:bg-purple-900/30 transition flex-shrink-0"
                >
                  <Icon className="w-4 h-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Language Selector */}
          <div ref={languageRef} className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="border border-gray-300 px-4 py-2 rounded-full text-sm flex items-center gap-2 hover:bg-purple-900/30 transition"
              aria-label="Language selector"
              aria-expanded={isOpen}
            >
              {language}
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isOpen && (
              <ul className="absolute mt-2 w-full bg-[#241970] rounded-lg shadow-lg z-10 overflow-hidden">
                {languages.map((lang) => (
                  <li key={lang}>
                    <button
                      onClick={() => handleLanguageChange(lang)}
                      className="w-full text-left px-4 py-2 hover:bg-purple-800 transition text-sm"
                    >
                      {lang}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Copyright Notice with clamp() sizing */}
      <p
        className="text-gray-400 mt-8 text-center"
        style={{ fontSize: "clamp(0.7rem, 2.5vw, 0.75rem)" }}
      >
        © {new Date().getFullYear()} NFTopia, Inc. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
