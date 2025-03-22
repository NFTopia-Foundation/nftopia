// PopularThisWeek Component - Showcases trending NFTs with a futuristic design
"use client";

import { useRef, useState, useMemo } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// NFT Data - Could be moved to a separate file (data/nfts.ts) for cleaner structure
const nfts = [
  { id: "1", title: "Neon", artist: "Topia", price: "1.2 STK", image: "/nfts/neon.jpg" },
  { id: "2", title: "Vibrance", artist: "Topia", price: "1.8 STK", image: "/nfts/vibrance.jpg" },
  { id: "3", title: "Digital Decade", artist: "Anthony Gargasz", price: "2.5 STK", image: "/nfts/digital-decade.jpg", featured: true, bidButton: true },
  { id: "4", title: "Neon Jelly", artist: "Topia", price: "1.5 STK", image: "/nfts/neon-jelly.jpg" },
  { id: "5", title: "Prism Miley", artist: "Topia", price: "1.7 STK", image: "/nfts/prism-miley.jpg" }
];

export function PopularThisWeek() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [focusedCard, setFocusedCard] = useState<string | null>(null);

  // Avoid re-calculating extendedNfts array on every render
  const extendedNfts = useMemo(() => [...nfts, ...nfts], []);

  // Function to pause animation
  const pauseMarquee = () => setIsPaused(true);
  const resumeMarquee = () => {
    setIsPaused(false);
    setFocusedCard(null);
  };

  return (
    <section className="py-20 overflow-hidden relative">
      {/* Background Visual Effects */}
      {/* Could extract this into a BackgroundEffects component for cleaner code */}
      
      {/* NFT Marquee Animation */}
      <div className="relative w-full" onMouseEnter={pauseMarquee} onMouseLeave={resumeMarquee}>
        <div ref={containerRef} className={cn("flex gap-8 py-8 px-4 w-max", !isPaused && "animate-marquee")} style={{ animationPlayState: isPaused ? "paused" : "running" }}>
          {extendedNfts.map((nft, index) => (
            <div key={`${nft.id}-${index}`} className={cn("transition-all duration-500 ease-out w-[240px]", focusedCard === `${nft.id}-${index}` ? "scale-110 z-10" : "scale-100 z-0")}
              onMouseEnter={() => setFocusedCard(`${nft.id}-${index}`)}
              onMouseLeave={() => setFocusedCard(null)}
            >
              <div className={cn("relative overflow-hidden rounded-2xl h-full group", nft.featured ? "bg-gradient-to-br from-blue-500/90 via-indigo-500/90 to-purple-600/90 p-1.5 shadow-xl shadow-blue-500/30" : "bg-gradient-to-br from-pink-500/80 via-fuchsia-500/80 to-purple-500/80 p-1 transition-all duration-300")}>
                
                {/* Image with Improved Error Handling */}
                <div className="aspect-[3/4] relative flex-grow">
                  <Image
                    src={nft.image}
                    alt={`NFT Artwork: ${nft.title} by ${nft.artist}`} // More descriptive alt text
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    onError={(e) => {
                      console.error(`Error loading image: ${nft.image}`);
                      (e.target as HTMLImageElement).src = "https://via.placeholder.com/300x400?text=NFT";
                    }}
                  />
                </div>
                
              </div>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
}
