"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Heart, Home, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useBadges } from "./badges-provider";
import { CountBadge } from "@/components/ui/badge";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/explore", label: "Explore", icon: Compass },
  { href: "/bag", label: "Bag", icon: ShoppingBag, badge: "cart" as const },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile", label: "Profile", icon: User, badge: "notifications" as const },
];

/** Mobile bottom tab bar (PRD §7.1). Hidden on desktop. */
export function BottomNav() {
  const pathname = usePathname();
  const badges = useBadges();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-safe md:hidden no-print"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const Icon = t.icon;
          const count = t.badge === "cart" ? badges.cartCount : t.badge === "notifications" ? badges.unreadNotifications : 0;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-text-tertiary",
                )}
              >
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden strokeWidth={active ? 2.5 : 2} />
                  <CountBadge count={count} />
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
