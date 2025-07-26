"use client";

import { Inter } from "next/font/google";
import { Navbar } from "@/components/navbar";
import "./globals.css";
import Footer from "@/components/Footer";
import { CircuitBackground } from "@/components/circuit-background";
import { WebVitals } from "@/components/web-vitals";
import { StarknetProvider } from "@/components/StarknetProvider";
import { StoreProvider } from "@/lib/stores/store-provider";
import { Toast } from "@/components/ui/toast";
import { usePathname } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname?.includes("/auth/");

  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content="#181359" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="NFTopia" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#181359" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970] text-white relative contain-layout">
          <StoreProvider>
            <StarknetProvider>
              <main className="relative z-10 pt-16 md:pt-20">
                {/* The contain-layout class should be defined in global CSS for CSS containment */}
                {!isAuthPage && <Navbar />}
                {!isAuthPage && <CircuitBackground />}
                <WebVitals />
                <div className="container-responsive py-4 md:py-8">
                  {children}
                </div>
                {!isAuthPage && <Footer />}
              </main>
              <Toast />
            </StarknetProvider>
          </StoreProvider>
        </div>
      </body>
    </html>
  );
}
