"use client";

import { Inter } from "next/font/google";
import { Navbar } from "@/components/navbar";
import "./globals.css";
import Footer from "@/components/Footer";
import { CircuitBackground } from "@/components/circuit-background";
import { WebVitals } from "@/components/web-vitals";
import { StarknetProvider } from "@/components/StarknetProvider"; // We'll create this
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
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970] text-white relative">
          <StoreProvider>
            <StarknetProvider>
              <main className="relative z-10">
                {!isAuthPage && <Navbar />}
                {!isAuthPage && <CircuitBackground />}
                <WebVitals />
                {children}
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
