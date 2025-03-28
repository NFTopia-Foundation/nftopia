import Image from "next/image";
import { Button } from "@/components/ui/button";

export interface NFTItem {
  id: string;
  image: string;
  name: string;
  price: string;
  desc: string;
}

export default function PopularThisWeek({
  id,
  image,
  name,
  price,
  desc,
}: NFTItem) {
  return (
    <div
      key={id}
      className="relative p-2 min-w-fit max-w-xl rounded-lg before:absolute before:inset-0 before:rounded-lg before:bg-gradient-to-r before:from-[#4e3bff] before:to-[#9747ff] before:animate-pulse-glow before:z-0 h-full max-h-[400px] "
    >
      <div className="  w-full  bg-gradient-to-b from-[#141F35] to-black backdrop-blur-sm  h-full rounded-lg  text-white z-10">
        <div className="px-3 py-4">
          <Image src={image} width={200} height={100} alt={"name"} />
          <p className="text-base font-medium">{name}</p>
          <p className="text-sm text-[#838892]">{desc}</p>
        </div>
        <div className="flex bg-[#0c101d]   p-4 items-center justify-between">
          <div className="bg-[#14285A] text-[#467BBD] rounded-full border-[0.9px] border-[#cedcf9]  px-3 shadow-none py-2 text-xs font-normal">
            {price}
          </div>
          <Button className="bg-[#14285A] rounded-full border-[0.9px] border-[#cedcf9] font-normal px-4 shadow-none text-sm">
            Bid
          </Button>
        </div>
      </div>
    </div>
  );
}
