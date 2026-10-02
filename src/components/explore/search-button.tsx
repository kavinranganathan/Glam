"use client";

import * as React from "react";
import { Mic, Search } from "lucide-react";
import { SearchOverlay } from "@/components/layout/search-overlay";

/** Prominent search stub on Explore that opens the global search overlay (PRD S08). */
export function ExploreSearchButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open search"
        aria-haspopup="dialog"
        className="flex h-12 w-full items-center gap-3 rounded-pill border border-border bg-surface px-4 text-left text-sm text-text-tertiary shadow-card hover:border-text-tertiary"
      >
        <Search className="h-5 w-5" aria-hidden />
        <span className="flex-1 truncate">Search products, brands, concerns</span>
        <Mic className="h-5 w-5" aria-hidden />
      </button>
      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </>
  );
}
