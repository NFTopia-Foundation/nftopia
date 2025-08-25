import { Inter } from "next/font/google";
import "./globals.css";
import type { Metadata } from 'next'
import ClientLayout from './client-layout';

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
metadataBase: new URL('http://localhost:5000'),
  title: 'NFTopia - NFT Marketplace',
  description: 'Discover, create, and trade unique NFTs on the Starknet blockchain',
  manifest: '/manifest.json',
  themeColor: '#000000',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NFTopia',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'NFTopia',
    title: 'NFTopia - NFT Marketplace',
    description: 'Discover, create, and trade unique NFTs on the Starknet blockchain',
    images: ['/og-image.jpg'], // Add your Open Graph image
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NFTopia - NFT Marketplace',
    description: 'Discover, create, and trade unique NFTs on the Starknet blockchain',
    images: ['/twitter-image.jpg'], // Add your Twitter image
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/nftopia-04.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/nftopia-icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NFTopia" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#0f0c38" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={inter.className}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
