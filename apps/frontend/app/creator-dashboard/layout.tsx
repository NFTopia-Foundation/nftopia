import Link from 'next/link';
import React from 'react';

export default function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen mt-8 bg-gray-900">
      <aside className="w-64 bg-gray-800 text-white p-6">
        <nav>
          <ul className="list-none p-0">
            <li className="mb-6">
              <Link 
                href="/creator-dashboard" 
                className="text-purple-400 font-semibold"
              >
                Dashboard
              </Link>
            </li>
            <li className="mb-4">
              <Link 
                href="/creator-dashboard/create-your-collection"
                className="text-white hover:text-purple-300 transition-colors"
              >
                Create Collection
              </Link>
            </li>
            <li className="mb-4">
              <Link 
                href="/creator-dashboard/my-nfts"
                className="text-white hover:text-purple-300 transition-colors"
              >
                My NFTs
              </Link>
            </li>
            <li className="mb-4">
              <Link 
                href="/creator-dashboard/collections"
                className="text-white hover:text-purple-300 transition-colors"
              >
                Collections
              </Link>
            </li>
            <li className="mb-4">
              <Link 
                href="/creator-dashboard/sales"
                className="text-white hover:text-purple-300 transition-colors"
              >
                Sales
              </Link>
            </li>
            <li className="mb-4">
              <Link 
                href="/creator-dashboard/settings"
                className="text-white hover:text-purple-300 transition-colors"
              >
                Settings
              </Link>
            </li>
          </ul>
        </nav>
        <Link href="/creator-dashboard/mint-nft">
          <button className="w-full py-3 bg-gradient-to-r from-purple-400 to-blue-500 text-white border-none rounded-lg font-semibold mt-8 hover:opacity-90 transition-opacity">
            Mint New NFT
          </button>
        </Link>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}







// import Link from 'next/link';
// import React from 'react';

// export default function CreatorDashboardLayout({ children }: { children: React.ReactNode }) {
//   return (
//     <div style={{ display: 'flex', minHeight: '100vh', background: '#181C23' }}>
//       <aside style={{ width: 260, background: '#232836', color: '#fff', padding: 24 }}>
//         <nav>
//           <ul style={{ listStyle: 'none', padding: 0 }}>
//             <li style={{ marginBottom: 24 }}><Link href="/creator-dashboard" style={{ color: '#a78bfa', fontWeight: 600 }}>Dashboard</Link></li>
//             <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/my-nfts">My NFTs</Link></li>
//             <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/collections">Collections</Link></li>
//             <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/sales">Sales</Link></li>
//             <li style={{ marginBottom: 16 }}><Link href="/creator-dashboard/settings">Settings</Link></li>
//           </ul>
//         </nav>
//         <Link href="/creator-dashboard/mint-nft">
//           <button style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(90deg, #a78bfa, #3b82f6)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, marginTop: 32 }}>Mint New NFT</button>
//         </Link>
//       </aside>
//       <main style={{ flex: 1, padding: 32 }}>{children}</main>
//     </div>
//   );
// } 