"use client";

import LottiePlayer from "@/components/animations/LottiePlayer";
import Link from "next/link";
import React from "react";

const NotFound = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col space-y-3 ml-48">
        <h1 className="text-6xl font-bold">Oops!</h1>
        <p className="text-4xl">
          We can’t seem to find the page you’re looking for.
        </p>
        <p className="text-4xl">Error code: 404</p>
        <Link href="/">
          <button className="rounded-xl px-6 py-4 bg-gradient-to-r from-[#4e3bff] to-[#9747ff] text-white hover:opacity-90">
            Back to Homepage
          </button>
        </Link>
      </div>

      <div className=" -ml-48 ">
        <LottiePlayer />
      </div>
    </div>
  );
};

export default NotFound;
