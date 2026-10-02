import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CreditCard,
  Gift,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Package,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Ticket,
} from "lucide-react";
import { LogoutButton } from "./logout-button";

const ITEMS = [
  { href: "/orders", label: "My Orders", hint: "Track, cancel, return", Icon: Package },
  { href: "/profile/beauty", label: "Beauty Profile", hint: "Skin, hair and style", Icon: Sparkles },
  { href: "/profile/addresses", label: "Addresses", hint: "Delivery addresses", Icon: MapPin },
  { href: "/profile/payments", label: "Payment Methods", hint: "Saved UPI and cards", Icon: CreditCard },
  { href: "/profile/rewards", label: "GLAM Rewards", hint: "Points, tier, referrals", Icon: Gift },
  { href: "/profile/reviews", label: "My Reviews", hint: "Edit within 7 days", Icon: Star },
  { href: "/profile/coupons", label: "Coupons & Offers", hint: "Active and expiring soon", Icon: Ticket },
  { href: "/notifications", label: "Notifications", hint: "Last 90 days", Icon: Bell },
  { href: "/help", label: "Help & Support", hint: "FAQ, tickets, callback", Icon: HelpCircle },
  { href: "/profile/notifications", label: "Notification Settings", hint: "Choose what we send", Icon: SlidersHorizontal },
  { href: "/profile/privacy", label: "Privacy Settings", hint: "Consent, download, delete", Icon: ShieldCheck },
  { href: "/profile/settings", label: "App Settings", hint: "Language, theme, version", Icon: Settings },
] as const;

/** S35 account menu. Each row is a 44px+ link; admin row appears for admins only. */
export function ProfileMenu({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav aria-label="Account" className="overflow-hidden rounded-card border border-border bg-background">
      <ul className="divide-y divide-border">
        {isAdmin && (
          <li>
            <MenuRow href="/admin" label="Admin dashboard" hint="Orders, returns, banners, coupons" Icon={LayoutDashboard} accent />
          </li>
        )}
        {ITEMS.map((item) => (
          <li key={item.href}>
            <MenuRow {...item} />
          </li>
        ))}
        <li>
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
}

function MenuRow({
  href,
  label,
  hint,
  Icon,
  accent,
}: {
  href: string;
  label: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface focus-visible:bg-surface">
      <span className={accent ? "rounded-full bg-secondary-soft p-2 text-secondary" : "rounded-full bg-primary-soft p-2 text-primary"}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-text">{label}</span>
        <span className="block text-xs text-text-tertiary">{hint}</span>
      </span>
      <ChevronRight className="h-5 w-5 text-text-tertiary" aria-hidden />
    </Link>
  );
}
