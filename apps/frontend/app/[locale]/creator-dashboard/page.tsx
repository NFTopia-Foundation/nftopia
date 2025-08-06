"use client";

import React from "react";
import { useTranslation } from "@/hooks/useTranslation";

export default function CreatorDashboardPage() {
  const { t } = useTranslation();

  const dashboardCards = [
    {
      label: t("creatorDashboard.totalNFTs"),
      value: "142",
      change: "+12%",
      color: "bg-purple-400",
      icon: "📦",
    },
    {
      label: t("creatorDashboard.sales7d"),
      value: "3.2 STRK",
      change: "+24%",
      color: "bg-blue-500",
      icon: "🏷️",
    },
    {
      label: t("creatorDashboard.royalties"),
      value: "0.8 STRK",
      change: "+5%",
      color: "bg-green-500",
      icon: "💳",
    },
    {
      label: t("creatorDashboard.followers"),
      value: "1.2K",
      change: "+18%",
      color: "bg-red-500",
      icon: "👤",
    },
  ];

  return (
    <div className="p-12 bg-nftopia-background min-h-screen">
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {dashboardCards.map((card) => (
          <div
            key={card.label}
            className="bg-nftopia-card border border-nftopia-border text-nftopia-text rounded-xl p-6 flex-1 min-w-[180px]"
          >
            <div className="text-lg font-semibold text-nftopia-text">{card.label}</div>
            <div className="text-3xl font-bold my-2 text-nftopia-text">{card.value}</div>
            <div className="text-sm text-nftopia-subtext">{card.change}</div>
          </div>
        ))}
      </div>

      <div className="bg-nftopia-card border border-nftopia-border rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div className="text-xl font-semibold text-nftopia-text">
            {t("creatorDashboard.recentActivity")}
          </div>
          <a href="#" className="text-nftopia-primary font-medium hover:text-nftopia-hover">
            {t("creatorDashboard.viewAll")}
          </a>
        </div>
        {/* Recent activity list goes here */}
      </div>

      <div>
        <div className="text-xl font-semibold text-nftopia-text mb-4">
          {t("creatorDashboard.quickActions")}
        </div>
        <div className="bg-nftopia-card border border-nftopia-border rounded-lg p-6 w-80">
          <div className="font-semibold text-nftopia-text mb-2">
            {t("creatorDashboard.mintNewNFT")}
          </div>
          <div className="text-nftopia-subtext mb-3">
            {t("creatorDashboard.singleOrBatch")}
          </div>
          <a
            href="/creator-dashboard/mint-nft"
            className="text-nftopia-primary font-medium hover:text-nftopia-hover"
          >
            {t("creatorDashboard.goToMint")}
          </a>
        </div>
      </div>
    </div>
  );
}
