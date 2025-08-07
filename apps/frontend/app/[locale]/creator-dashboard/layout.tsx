"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useTranslation } from "@/hooks/useTranslation";

export default function CreatorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-nftopia-background">
      {/* Mobile Menu Button - Attached to Sidebar */}
      <button
        onClick={toggleSidebar}
        className="xl:hidden fixed top-3 z-50 p-2 bg-nftopia-card border border-nftopia-border rounded-lg text-nftopia-text hover:bg-nftopia-hover transition-colors transform duration-300 ease-in-out"
        style={{
          left: isSidebarOpen ? "13rem" : "1rem", // 16rem = 256px (w-64), 1rem = 16px
        }}
      >
        {isSidebarOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="xl:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed xl:static inset-y-0 left-0 z-40 w-64 bg-nftopia-card border-r border-nftopia-border text-nftopia-text transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full xl:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="p-6 border-b border-nftopia-border">
            <Link href={`/${locale}`} className="flex items-center">
              <Image
                src="/nftopia-04.svg"
                alt="NFTopia Logo"
                width={120}
                height={32}
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6">
            <ul className="list-none p-0 space-y-4">
              <li>
                <Link
                  href={`/${locale}/creator-dashboard`}
                  className="text-nftopia-primary font-semibold block py-2"
                  onClick={closeSidebar}
                >
                  {t("navigation.dashboard")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/creator-dashboard/create-your-collection`}
                  className="text-nftopia-text hover:text-nftopia-primary transition-colors block py-2"
                  onClick={closeSidebar}
                >
                  {t("creator.createNFT")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/creator-dashboard/my-nfts`}
                  className="text-nftopia-text hover:text-nftopia-primary transition-colors block py-2"
                  onClick={closeSidebar}
                >
                  {t("profile.myNFTs")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/creator-dashboard/collections`}
                  className="text-nftopia-text hover:text-nftopia-primary transition-colors block py-2"
                  onClick={closeSidebar}
                >
                  {t("profile.myCollections")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/creator-dashboard/sales`}
                  className="text-nftopia-text hover:text-nftopia-primary transition-colors block py-2"
                  onClick={closeSidebar}
                >
                  {t("creator.earnings")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/creator-dashboard/settings`}
                  className="text-nftopia-text hover:text-nftopia-primary transition-colors block py-2"
                  onClick={closeSidebar}
                >
                  {t("profile.settings")}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Mint Button */}
          <div className="p-6 border-t border-nftopia-border">
            <Link
              href={`/${locale}/creator-dashboard/mint-nft`}
              onClick={closeSidebar}
            >
              <button className="w-full py-3 bg-nftopia-primary text-nftopia-text border-none rounded-lg font-semibold hover:bg-nftopia-hover transition-colors">
                {t("creator.mint")}
              </button>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 w-full lg:ml-0 bg-nftopia-background">
        {children}
      </main>
    </div>
  );
}
