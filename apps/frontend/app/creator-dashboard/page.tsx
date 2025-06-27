import React from 'react';

const dashboardCards = [
  { label: 'Total NFTs', value: '142', change: '+12%', color: '#a78bfa', icon: '📦' },
  { label: 'Sales (7d)', value: '3.2 ETH', change: '+24%', color: '#3b82f6', icon: '🏷️' },
  { label: 'Royalties', value: '0.8 ETH', change: '+5%', color: '#22c55e', icon: '💳' },
  { label: 'Followers', value: '1.2K', change: '+18%', color: '#ef4444', icon: '👤' },
];

export default function CreatorDashboardPage() {
  return (
    <div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        {dashboardCards.map(card => (
          <div key={card.label} style={{ background: card.color, color: '#fff', borderRadius: 16, padding: 24, flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>{card.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, margin: '8px 0' }}>{card.value}</div>
            <div style={{ fontSize: 14 }}>{card.change}</div>
          </div>
        ))}
      </div>
      <div style={{ background: '#232836', borderRadius: 12, padding: 24, marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>Recent Activity</div>
          <a href="#" style={{ color: '#a78bfa', fontWeight: 500 }}>View All</a>
        </div>
        {/* Recent activity list goes here */}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Quick Actions</div>
        <div style={{ background: '#232836', borderRadius: 12, padding: 24, width: 320 }}>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 8 }}>Mint New NFT</div>
          <div style={{ color: '#a1a1aa', marginBottom: 12 }}>Single or batch upload</div>
          <a href="/creator-dashboard/mint-nft" style={{ color: '#a78bfa', fontWeight: 500 }}>Go to Mint</a>
        </div>
      </div>
    </div>
  );
} 