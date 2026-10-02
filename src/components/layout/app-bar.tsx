"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, Search, ShoppingBag, User } from "lucide-react";
import { Logo } from "./logo";
import { SearchOverlay } from "./search-overlay";
import { useBadges } from "./badges-provider";
import { CountBadge } from "@/components/ui/badge";

/** Global app bar (PRD §8.2.1): logo, search stub, bell with badge, bag with badge. */
export function AppBar({ userName }: { userName: string | null }) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const badges = useBadges();
  const pathname = usePathname();
  const params = useSearchParams();
  const initialQuery = pathname === "/search" ? (params.get("q") ?? "") : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 h-14 md:h-16">
        <Logo />
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-pill bg-surface px-4 h-10 text-left text-sm text-text-tertiary hover:bg-border/60 md:max-w-xl md:mx-auto"
          aria-label="Open search"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span className="truncate">{initialQuery || "Search serums, lipsticks, kurtas…"}</span>
        </button>
        <nav className="flex items-center gap-1" aria-label="Quick actions">
          <Link href="/notifications" className="relative rounded-full p-2.5 hover:bg-surface" aria-label="Notifications">
            <Bell className="h-5 w-5" aria-hidden />
            <CountBadge count={badges.unreadNotifications} />
          </Link>
          <Link href="/bag" className="relative rounded-full p-2.5 hover:bg-surface" aria-label="Bag">
            <ShoppingBag className="h-5 w-5" aria-hidden />
            <CountBadge count={badges.cartCount} />
          </Link>
          <Link
            href={badges.isLoggedIn || userName ? "/profile" : "/login"}
            className="hidden md:inline-flex items-center gap-2 rounded-pill px-3 h-10 hover:bg-surface text-sm font-medium"
          >
            <User className="h-5 w-5" aria-hidden />
            <span className="max-w-[8rem] truncate">{userName ? `Hi, ${userName.split(" ")[0]}` : "Sign in"}</span>
          </Link>
        </nav>
      </div>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} initialQuery={initialQuery} />
    </header>
  );
}
