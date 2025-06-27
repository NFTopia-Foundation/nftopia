import Link from 'next/link';
import React from 'react';

export default function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#181C23' }}>
      <aside style={{ width: 260, background: '#232836', color: '#fff', padding: 24 }}>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: 24 }}><Link href="/creator-dashboard" style={{ color: '#a78bfa', fontWeight: 600 }}>Dashboard</Link></li>
            <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/my-nfts">My NFTs</Link></li>
            <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/collections">Collections</Link></li>
            <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/sales">Sales</Link></li>
            <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/settings">Settings</Link></li>
          </ul>
        </nav>
        <Link href="/creator-dashboard/mint-nft">
          <button style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(90deg, #a78bfa, #3b82f6)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, marginTop: 32 }}>Mint New NFT</button>
        </Link>
      </aside>
      <main style={{ flex: 1, padding: 32 }}>{children}</main>
    </div>
  );
} 