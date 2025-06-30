"use client"

import { useState, useEffect } from "react"
import { Grid3X3, DollarSign, Eye, Users } from "lucide-react"
import { StatCard } from "./components/card-stat"
import { QuickActions } from "./components/quick-actions"
import { DashboardHeader } from "./components/dashboard-header"
import { CollectionsSection } from "./components/collections-section"
import { mockStats, mockCollections } from "./data/mock-data"

export default function CreatorDashboard() {
  const [isLoading, setIsLoading] = useState(false)

  // Simulate loading state
  useEffect(() => {
    setIsLoading(true)
    const timer = setTimeout(() => setIsLoading(false), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970]">
      {/* Header */}
      <DashboardHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Grid3X3 as React.ComponentType}
            label="NFTs Created"
            value={mockStats.nftsCreated}
            change={12}
            isLoading={isLoading}
          />
          <StatCard
            icon={DollarSign as React.ComponentType}
            label="Total Sales"
            value={mockStats.totalSales}
            change={8}
            isLoading={isLoading}
          />
          <StatCard icon={Eye as React.ComponentType} label="Total Views" value={mockStats.totalViews} change={-3} isLoading={isLoading} />
          <StatCard icon={Users as React.ComponentType} label="Followers" value={mockStats.followers} change={15} isLoading={isLoading} />
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Collections Grid */}
        <CollectionsSection collections={mockCollections} isLoading={isLoading} />
      </div>
    </div>
  )
}
