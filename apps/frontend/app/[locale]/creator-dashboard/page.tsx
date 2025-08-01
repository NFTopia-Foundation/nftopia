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
    <div className="p-12">
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        {dashboardCards.map((card) => (
          <div
            key={card.label}
            className={`${card.color} text-white rounded-xl p-6 flex-1 min-w-[180px]`}
          >
            <div className="text-lg font-semibold">{card.label}</div>
            <div className="text-3xl font-bold my-2">{card.value}</div>
            <div className="text-sm">{card.change}</div>
          </div>
        ))}
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <div className="text-xl font-semibold text-white">
            {t("creatorDashboard.recentActivity")}
          </div>
          <a href="#" className="text-purple-400 font-medium">
            {t("creatorDashboard.viewAll")}
          </a>
        </div>
        {/* Recent activity list goes here */}
      </div>

      <div>
        <div className="text-xl font-semibold text-white mb-4">
          {t("creatorDashboard.quickActions")}
        </div>
        <div className="bg-gray-800 rounded-lg p-6 w-80">
          <div className="font-semibold text-white mb-2">
            {t("creatorDashboard.mintNewNFT")}
          </div>
          <div className="text-gray-400 mb-3">
            {t("creatorDashboard.singleOrBatch")}
          </div>
          <a
            href="/creator-dashboard/mint-nft"
            className="text-purple-400 font-medium"
          >
            {t("creatorDashboard.goToMint")}
          </a>
        </div>
      </div>
    </div>
  );
}
