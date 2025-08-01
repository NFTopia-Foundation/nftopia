"use client";

import { Inter } from "next/font/google";
import { Navbar } from "@/components/navbar";
import "../globals.css";
import Footer from "@/components/Footer";
import { CircuitBackground } from "@/components/circuit-background";
import { WebVitals } from "@/components/web-vitals";
import { StarknetProvider } from "@/components/StarknetProvider";
import { StoreProvider } from "@/lib/stores/store-provider";
import { Toast } from "@/components/ui/toast";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import Head from "next/head";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

export default function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const isAuthPage = pathname?.includes("/auth/");
  const isCreatorDashboard = pathname?.includes("/creator-dashboard");

  // Generate hreflang URLs
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const currentPath = pathname?.replace(/^\/[a-z]{2}/, "") || "";

  const hreflangUrls = {
    en: `${baseUrl}/en${currentPath}`,
    fr: `${baseUrl}/fr${currentPath}`,
  };

  return (
    <html lang={locale}>
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

        {/* SEO Meta Tags */}
        <title>{t("seo.title")}</title>
        <meta name="description" content={t("seo.description")} />
        <meta name="keywords" content={t("seo.keywords")} />

        {/* Hreflang Tags for SEO */}
        <link rel="alternate" hrefLang="en" href={hreflangUrls.en} />
        <link rel="alternate" hrefLang="fr" href={hreflangUrls.fr} />
        <link rel="alternate" hrefLang="x-default" href={hreflangUrls.en} />

        {/* Open Graph Tags */}
        <meta property="og:title" content={t("seo.title")} />
        <meta property="og:description" content={t("seo.description")} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content={locale} />
        <meta
          property="og:locale:alternate"
          content={locale === "en" ? "fr" : "en"}
        />

        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={t("seo.title")} />
        <meta name="twitter:description" content={t("seo.description")} />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-[#0f0c38] via-[#181359] to-[#241970] text-white relative contain-layout">
          <StoreProvider>
            <StarknetProvider>
              {isCreatorDashboard ? (
                // Creator Dashboard - No navbar, no padding, no footer
                <main className="relative z-10">
                  <WebVitals />
                  {children}
                </main>
              ) : (
                // Regular pages with navbar and footer
                <main className="relative z-10 pt-16 md:pt-20">
                  {!isAuthPage && <Navbar />}
                  {!isAuthPage && <CircuitBackground />}
                  <WebVitals />
                  <div className="container-responsive py-4 md:py-8">
                    {children}
                  </div>
                  {!isAuthPage && <Footer />}
                </main>
              )}
              <Toast />
            </StarknetProvider>
          </StoreProvider>
        </div>
      </body>
    </html>
  );
}
