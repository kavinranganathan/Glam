import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Globe, Info, Moon, Star } from "lucide-react";
import { getUser } from "@/lib/auth/session";
import pkg from "../../../../../package.json";

export const metadata: Metadata = { title: "App Settings" };

/** App settings: language/theme placeholders (Phase 2), version, legal links, rate. */
export default async function SettingsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/settings");
  const version = (pkg as { version?: string }).version ?? "0.0.0";
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">App settings</h1>

      <dl className="divide-y divide-border rounded-card border border-border">
        <Row Icon={Globe} label="Language" value="English" note="Hindi coming in Phase 2" />
        <Row Icon={Moon} label="Theme" value="Light" note="Dark mode coming soon" />
        <Row Icon={Info} label="App version" value={`v${version}`} note="Web · Next.js" />
      </dl>

      <section className="rounded-card border border-border" aria-labelledby="legal">
        <h2 id="legal" className="px-4 pt-4 font-display text-base font-semibold text-text">
          Legal
        </h2>
        <ul className="mt-2 divide-y divide-border">
          <LinkRow href="/help#terms" label="Terms of Service" />
          <LinkRow href="/help#privacy" label="Privacy Policy" />
          <LinkRow href="/help#returns" label="Return & Refund Policy" />
        </ul>
      </section>

      <a
        href="mailto:hello@glam.example?subject=GLAM%20feedback"
        className="flex min-h-14 items-center gap-3 rounded-card border border-border px-4 py-3 hover:bg-surface"
      >
        <span className="rounded-full bg-warning-soft p-2 text-warning">
          <Star className="h-5 w-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-text">Rate GLAM</span>
          <span className="block text-xs text-text-tertiary">Tell us what you love and what to fix</span>
        </span>
        <ChevronRight className="h-5 w-5 text-text-tertiary" aria-hidden />
      </a>
    </div>
  );
}

function Row({ Icon, label, value, note }: { Icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>; label: string; value: string; note: string }) {
  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-3">
      <span className="rounded-full bg-primary-soft p-2 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <dt className="flex-1 text-sm font-semibold text-text">
        {label}
        <span className="block text-xs font-normal text-text-tertiary">{note}</span>
      </dt>
      <dd className="text-sm text-text-secondary">{value}</dd>
    </div>
  );
}

function LinkRow({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-12 items-center justify-between px-4 py-3 text-sm font-medium text-text hover:bg-surface">
        {label}
        <ChevronRight className="h-5 w-5 text-text-tertiary" aria-hidden />
      </Link>
    </li>
  );
}
