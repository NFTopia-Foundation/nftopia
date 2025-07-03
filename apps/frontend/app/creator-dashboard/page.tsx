import React from 'react';

const dashboardCards = [
  { label: 'Total NFTs', value: '142', change: '+12%', color: 'bg-purple-400', icon: '📦' },
  { label: 'Sales (7d)', value: '3.2 STRK', change: '+24%', color: 'bg-blue-500', icon: '🏷️' },
  { label: 'Royalties', value: '0.8 STRK', change: '+5%', color: 'bg-green-500', icon: '💳' },
  { label: 'Followers', value: '1.2K', change: '+18%', color: 'bg-red-500', icon: '👤' },
];

export default function CreatorDashboardPage() {
  return (
    <div className="p-12">
      <div className="flex gap-6 mb-8">
        {dashboardCards.map(card => (
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
          <div className="text-xl font-semibold text-white">Recent Activity</div>
          <a href="#" className="text-purple-400 font-medium">View All</a>
        </div>
        {/* Recent activity list goes here */}
      </div>
      
      <div>
        <div className="text-xl font-semibold text-white mb-4">Quick Actions</div>
        <div className="bg-gray-800 rounded-lg p-6 w-80">
          <div className="font-semibold text-white mb-2">Mint New NFT</div>
          <div className="text-gray-400 mb-3">Single or batch upload</div>
          <a href="/creator-dashboard/mint-nft" className="text-purple-400 font-medium">Go to Mint</a>
        </div>
      </div>
    </div>
  );
}
