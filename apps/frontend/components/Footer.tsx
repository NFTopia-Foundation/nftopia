"use client";
import React from "react";
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
import { useState } from "react";

const Footer = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState("English");

  const languages = ["English", "French", "Spanish"];

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    setIsOpen(false);
  };
  return (
    <footer className="bg-[#181359] text-white py-8 px-2 sm:px-4 border-t border-purple-500/20 contain-layout">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 items-center text-center sm:text-center lg:text-left">
        {/* Logo */}
        <div className="flex justify-center lg:justify-start mb-4 sm:mb-0">
          <Link
            href="/"
            className="flex items-center min-h-[48px] min-w-[48px]"
            tabIndex={0}
            aria-label="Home"
          >
            <Image
              src="/nftopia-04.svg"
              alt="NFTopia Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
        </div>
        {/* Navigation Links */}
        <nav className="flex flex-wrap flex-col sm:flex-row justify-center gap-2 sm:gap-4 text-[clamp(0.9rem,2vw,1.05rem)] sm:mb-4 lg:mb-0">
          <Link
            href="/sitemap"
            className="hover:text-gray-300 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            Sitemap
          </Link>
          <Link
            href="/privacy-policy"
            className="hover:text-gray-300 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="hover:text-gray-300 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            Terms of Service
          </Link>
          <Link
            href="/contact"
            className="hover:text-gray-300 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            Contact Us
          </Link>
          <Link
            href="/shop"
            className="hover:text-gray-300 transition min-h-[48px] min-w-[48px] flex items-center justify-center"
          >
            Official Shop
          </Link>
        </nav>
        {/* Social Media + Language */}
        <div className="flex flex-col items-center lg:items-end gap-4 sm:mt-4 lg:mt-0">
          {/* Social Media Icons */}
          <div className="flex gap-3 sm:gap-4 mt-2 sm:mt-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 max-w-full">
            <Link
              href="https://facebook.com"
              target="_blank"
              aria-label="Facebook"
              className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Facebook className="w-5 h-5" />
            </Link>
            <Link
              href="https://instagram.com"
              target="_blank"
              aria-label="Instagram"
              className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Instagram className="w-5 h-5" />
            </Link>
            <Link
              href="https://twitter.com"
              target="_blank"
              aria-label="Twitter"
              className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Twitter className="w-5 h-5" />
            </Link>
            <Link
              href="mailto:support@nftopia.com"
              aria-label="Email"
              className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Mail className="w-5 h-5" />
            </Link>
            <Link
              href="https://youtube.com"
              target="_blank"
              aria-label="YouTube"
              className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              <Youtube className="w-5 h-5" />
            </Link>
          </div>
          {/* Language Dropdown */}
          <div className="relative mt-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="border border-gray-300 px-4 py-2 rounded-full text-sm flex items-center hover:bg-gray-800 transition min-h-[48px] min-w-[48px] focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-haspopup="listbox"
              aria-expanded={isOpen}
              tabIndex={0}
            >
              {language}
              <ChevronDown className="ml-2 w-4 h-4" />
            </button>
            {isOpen && (
              <ul
                className="absolute mt-2 w-36 bottom-full bg-white text-black rounded-md shadow-md z-10"
                role="listbox"
              >
                {languages.map((lang) => (
                  <li
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className="px-4 py-2 cursor-pointer hover:bg-gray-200 transition"
                    role="option"
                    aria-selected={language === lang}
                    tabIndex={0}
                  >
                    {lang}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {/* Copyright Notice */}
      <p
        className="text-[clamp(0.7rem,2vw,0.95rem)] text-gray-400 mt-6 text-center px-2 leading-tight"
        style={{ textShadow: "0 1px 2px #0008", wordBreak: "break-word" }}
      >
        © {new Date().getFullYear()} NFTopia, Inc. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
