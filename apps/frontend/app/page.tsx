import { ExploreCategories } from "@/components/explore-categories";
import { MainHero } from "@/components/main-hero";
import { TopSellers } from "@/components/top-sellers";

export default function Home() {
  return (
    <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 space-y-16">
      <MainHero />
      <TopSellers />
      <ExploreCategories />
    </div>
  );
}
