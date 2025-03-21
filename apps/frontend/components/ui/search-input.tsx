"use client";

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
  containerClassName?: string;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, containerClassName, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative flex items-center w-full max-w-[220px]",
          containerClassName
        )}
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Search className="text-gray-400 h-4 w-4" />
        </div>
        <input
          type="search"
          ref={ref}
          className={cn(
            "w-full bg-gray-900/40 backdrop-blur-sm rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 border border-gray-800/50",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
