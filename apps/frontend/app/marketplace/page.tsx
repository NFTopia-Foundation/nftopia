// import { MarketplaceHero } from "@/components/marketplace-hero";
import { CircuitBackground } from "@/components/circuit-background";
import { LiveAuctions } from "@/components/live-auctions";
import { TopSellers } from "@/components/top-sellers";
import { TodaysPicks } from "@/components/todays-picks";
import PopularCollection  from "@/components/PopularCollection";
// import { CreateAndSell } from "@/components/create-and-sell";

export default function MarketplacePage() {
  return (
    <main className="min-h-screen relative text-white overflow-hidden">
      {/* Background */}
      <CircuitBackground />

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-12 space-y-16">
        {/* <MarketplaceHero /> */}
        <LiveAuctions />
        <TopSellers />
        <TodaysPicks />
        <PopularCollection />
        {/* <CreateAndSell /> */}
      </div>
    </main>
  );
}
