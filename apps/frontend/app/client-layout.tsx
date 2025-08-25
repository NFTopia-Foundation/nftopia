"use client";

import { Navbar } from "@/components/navbar";
import Footer from "@/components/Footer";
import { CircuitBackground } from "@/components/circuit-background";
import { WebVitals } from "@/components/web-vitals";
import { StarknetProvider } from "@/components/StarknetProvider";
import { StoreProvider } from "@/lib/stores/store-provider";
import { Toast } from "@/components/ui/toast";
import { usePathname } from "next/navigation";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname?.includes("/auth/");

  return (
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
          <PWAInstallPrompt />
        </StarknetProvider>
      </StoreProvider>
    </div>
  );
}