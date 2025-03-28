"use client";

import React, { useState } from 'react';
import PopularThisWeek from './PopularThisWeek';

export type NFTItem = {
  id: number;
  name: string;
  image: string;
  price: string;
  desc: string;
};

const nftItems: NFTItem[] = [
  {
    id: 1,
    name: "CyberPunk #01",
    image: "/nftopia-03.svg",
    price: "2.5 ETH",
    desc: "By Anthony Gargasz",
  },
  {
    id: 2,
    name: "Futuristic Sphere",
    image: "/nftopia-03.svg",
    desc: "By Anthony Gargasz",
    price: "1.8 ETH",
  },
  {
    id: 3,
    name: "Neon Samurai",
    image: "/nftopia-03.svg",
    desc: "By Anthony Gargasz",
    price: "3.2 ETH",
  },
  {
    id: 4,
    name: "Neon Samurai",
    image: "/nftopia-03.svg",
    desc: "By Anthony Gargasz",
    price: "3.2 ETH",
  },
  {
    id: 5,
    name: "Neon Samurai",
    image: "/nftopia-03.svg",
    desc: "By Anthony Gargasz",
    price: "3.2 ETH",
  },
];

export const PopularThisWeekMarqueeParent: React.FC = () => {
  const [hoveredCardId, setHoveredCardId] = useState<number | null>(null);

  return (
    <div className="relative z-10 overflow-hidden">
      <div 
        className={`flex max-w-6xl mx-auto items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 whitespace-nowrap 
        ${hoveredCardId !== null ? 'animate-pause' : 'animate-marquee'}`}
      >
        {nftItems
          .concat(nftItems)
          .map(({ id, name, price, image, desc }, index) => (
            <div 
              key={index} 
              className={`transition-transform duration-300 ease-in-out 
              ${hoveredCardId === id ? 'scale-105' : ''}`}
              onMouseEnter={() => setHoveredCardId(id)}
              onMouseLeave={() => setHoveredCardId(null)}
            >
              <PopularThisWeek
                desc={desc}
                id={id.toString()}
                name={name}
                price={price}
                image={image}
              />
            </div>
          ))}
      </div>
    </div>
  );
};

export default PopularThisWeekMarqueeParent;