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
    <footer className="bg-[#181359] text-white py-8 px-4 border-t border-purple-500/20">
      <div className="max-w-7xl mx-auto flex flex-col items-center text-center md:justify-between space-y-6">
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

        {/* Navigation Links */}
        <nav className="flex flex-wrap flex-col md:flex-row justify-center mt-4 md:mt-0 gap-4 text-sm">
          <Link href="/sitemap" className="hover:text-gray-300 transition">
            Sitemap
          </Link>
          <Link
            href="/privacy-policy"
            className="hover:text-gray-300 transition"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="hover:text-gray-300 transition"
          >
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-gray-300 transition">
            Contact Us
          </Link>
          <Link href="/shop" className="hover:text-gray-300 transition">
            Official Shop
          </Link>
        </nav>

        {/* Social Media Icons */}
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link
            href="https://facebook.com"
            target="_blank"
            aria-label="Facebook"
            className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800"
          >
            <Facebook className="w-4 h-4 " />
          </Link>
          <Link
            href="https://instagram.com"
            target="_blank"
            aria-label="Instagram"
            className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800"
          >
            <Instagram className="w-4 h-4" />
          </Link>
          <Link
            href="https://twitter.com"
            target="_blank"
            aria-label="Twitter"
            className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800"
          >
            <Twitter className="w-4 h-4 " />
          </Link>
          <Link
            href="mailto:support@nftopia.com"
            aria-label="Email"
            className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800"
          >
            <Mail className="w-4 h-4" />
          </Link>
          <Link
            href="https://youtube.com"
            target="_blank"
            aria-label="YouTube"
            className="border border-gray-300 rounded-full p-2 hover:opacity-80 transition bg-gray-800"
          >
            <Youtube className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative mt-4">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="border border-gray-300 px-4 py-2 rounded-full text-sm flex items-center hover:bg-gray-800 transition"
          >
            {language}
          </button>

          {isOpen && (
            <ul className="absolute mt-2 w-36 bottom-full bg-white text-black rounded-md shadow-md">
              {languages.map((lang) => (
                <li
                  key={lang}
                  onClick={() => handleLanguageChange(lang)}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-200 transition"
                >
                  {lang}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Copyright Notice */}
      <p className="text-xs text-gray-400 mt-6 text-center">
        © {new Date().getFullYear()} NFTopia, Inc. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
