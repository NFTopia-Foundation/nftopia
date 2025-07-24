"use client";

import LottiePlayer from "@/components/animations/LottiePlayer";
import Link from "next/link";
import React from "react";
import { useMobile } from "@/hooks";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const isMobile = useMobile();

  return (
    <div
      className={`flex items-center justify-center min-h-[60vh] w-full px-4 py-12 ${
        isMobile ? "flex-col space-y-8" : "flex-row space-x-8"
      }`}
    >
      <div
        className={`flex flex-col ${
          isMobile
            ? "items-center text-center space-y-4"
            : "space-y-3 max-w-md items-start text-left"
        }`}
      >
        <h1
          className={
            isMobile ? "text-4xl font-bold mt-5" : "text-6xl mt-5 font-bold"
          }
        >
          Oops!
        </h1>
        <p className={isMobile ? "text-lg" : "text-2xl"}>
          We can’t seem to find the page you’re looking for.
        </p>
        <p className={isMobile ? "text-lg" : "text-2xl"}>Error code: 404</p>
        <Link href="/">
          <Button
            size={isMobile ? "sm" : "lg"}
            className="rounded-xl bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white mt-2"
          >
            Back to Homepage
          </Button>
        </Link>
      </div>
      <div className={isMobile ? "w-full max-w-2xl mt-8" : "w-[740px] ml-8"}>
        <LottiePlayer />
      </div>
    </div>
  );
};

export default NotFound;
