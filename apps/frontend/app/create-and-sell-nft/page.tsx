"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, FolderPlus, Upload, Tag, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreationStepCard from "@/components/CreationStepCard";

interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  isCompleted: boolean;
  link?: string; // Optional link for routing
  requiresModal?: boolean; // For wallet connection
}

type Layout = "desktop" | "mobile";

export default function CreateAndSellPage(): JSX.Element {
  const [isWalletConnected, setIsWalletConnected] = useState<boolean>(false);
  const [showWalletModal, setShowWalletModal] = useState<boolean>(false);

  const handleWalletConnect = (): void => {
    setShowWalletModal(true);
    // Simulate wallet connection for demo
    setTimeout(() => {
      setIsWalletConnected(true);
      setShowWalletModal(false);
    }, 1000);
  };

  const steps: Step[] = [
    {
      id: "wallet",
      icon: Wallet,
      title: "Set Up Your Wallet",
      description:
        "Connect your wallet to get started. We support multiple popular blockchain wallets.",
      color: "bg-blue-500",
      isCompleted: isWalletConnected,
      requiresModal: true, // This will trigger modal instead of navigation
    },
    {
      id: "collection",
      icon: FolderPlus,
      title: "Create Your Collection",
      description:
        "Upload your work and set up your collection. Add a description, social links and floor price.",
      color: "bg-green-500",
      isCompleted: false,
      link: "/create-your-collection",
    },
    {
      id: "nfts",
      icon: Upload,
      title: "Add Your NFTs",
      description:
        "Upload your NFTs and customize them with properties, stats, and unlockable content.",
      color: "bg-purple-500",
      isCompleted: false,
      link: "/add-nft-to-collection",
    },
    {
      id: "sell",
      icon: Tag,
      title: "List Them for Sale",
      description:
        "Choose between auctions, fixed-price listings, and declining-price listings for your NFTs.",
      color: "bg-red-500",
      isCompleted: false,
      link: "/list-nfts-for-sale",
    },
  ];

  const renderStepCard = (step: Step, index: number, layout: Layout) => {
    // If step requires modal (wallet connection), render with onClick
    if (step.requiresModal) {
      return (
        <div
          key={step.id}
          onClick={handleWalletConnect}
          className="cursor-pointer"
        >
          <CreationStepCard step={step} index={index} layout={layout} />
        </div>
      );
    }

    // If step has a link, wrap with Link component
    if (step.link) {
      return (
        <Link key={step.id} href={step.link} className="block">
          <CreationStepCard step={step} index={index} layout={layout} />
        </Link>
      );
    }

    // Fallback for steps without links
    return (
      <CreationStepCard
        key={step.id}
        step={step}
        index={index}
        layout={layout}
      />
    );
  };

  return (
    <div >
      {/* Hero Section */}
      <section className="relative px-4 py-16 md:pt-36 pb-8 lg:py-32">
        <div className="container mx-auto max-w-6xl">
          <div className="text-start space-y-6 pt-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Create And Sell Your NFTs
            </h1>
            <p className="text-lg md:text-xl text-gray-300 max-w-2xl leading-relaxed">
              Get started in just a few simple steps and begin your journey in
              the NFT marketplace
            </p>
          </div>

          {/* Process Steps Section */}
          <section className="py-16 md:pt-24 pb-8">
            <div className="container mx-auto max-w-7xl">
              {/* Desktop Layout - 4 Columns */}
              <div className="hidden lg:grid lg:grid-cols-4 gap-8">
                {steps.map((step, index) =>
                  renderStepCard(step, index, "desktop")
                )}
              </div>

              {/* Mobile/Tablet Layout - Stacked */}
              <div className="lg:hidden space-y-8">
                {steps.map((step, index) =>
                  renderStepCard(step, index, "mobile")
                )}
              </div>
            </div>
          </section>

          <Button
            onClick={handleWalletConnect}
            size="lg"
            className="bg-gradient-to-r from-[#4e3bff] via-[#9747ff] to-[#6d3bff] hover:opacity-90 rounded-full px-8 py-6 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300"
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Wallet Connection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Connect Wallet
            </h3>
            <p className="text-gray-600 mb-6">Connecting your wallet...</p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
