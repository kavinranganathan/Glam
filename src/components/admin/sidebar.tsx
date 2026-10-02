"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils/cn";

export const ADMIN_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/returns", label: "Returns" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/flash-sales", label: "Flash sales" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/catalogue", label: "Catalogue" },
  { href: "/admin/outbox", label: "Outbox" },
  { href: "/admin/tickets", label: "Tickets" },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/");
}

/** Desktop sidebar + mobile top tabs for the admin area. */
export function AdminSidebar({ userName }: { userName: string | null }) {
  const pathname = usePathname();
  return (
    <>
      <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-r md:border-border md:bg-surface">
        <div className="flex items-center gap-2 px-5 py-4">
          <Logo size="sm" />
          <span className="rounded-pill bg-text px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Admin</span>
        </div>
        <nav aria-label="Admin" className="flex-1 px-3">
          <ul className="flex flex-col gap-0.5">
            {ADMIN_NAV.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center rounded-card px-3 text-sm font-medium",
                      active ? "bg-primary-soft text-primary" : "text-text-secondary hover:bg-background hover:text-text",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-border px-5 py-4 text-xs text-text-tertiary">
          <p className="truncate">{userName ?? "Admin"}</p>
          <Link href="/" className="mt-2 inline-flex items-center gap-1 font-semibold text-primary">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back to store
          </Link>
        </div>
      </aside>

      <div className="md:hidden border-b border-border bg-surface">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="rounded-pill bg-text px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Admin</span>
          </div>
          <Link href="/" className="text-sm font-semibold text-primary">
            Back to store
          </Link>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto scrollbar-none px-2 pb-2">
          {ADMIN_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-pill px-3 py-2 text-sm font-medium",
                  active ? "bg-primary text-white" : "bg-background text-text-secondary border border-border",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
