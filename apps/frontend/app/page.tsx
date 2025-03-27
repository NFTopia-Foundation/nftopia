import PopularThisWeek from "@/components/PopularThisWeek";
import Image from "next/image";

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

export default function Home() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex max-w-6xl mx-auto items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 animate-marquee whitespace-nowrap">
        {nftItems
          .concat(nftItems)
          .map(({ id, name, price, image, desc }, index) => (
            <PopularThisWeek
              key={index}
              desc={desc}
              id={id}
              name={name}
              price={price}
              image={image}
            />
          ))}
      </div>
    </div>
  );
}
