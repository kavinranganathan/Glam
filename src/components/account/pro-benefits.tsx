import { Check, Minus } from "lucide-react";
import { TIER_LABEL, TIER_ORDER } from "@/lib/loyalty/tiers";
import type { Tier } from "@/lib/pricing/types";

interface Row {
  label: string;
  tiers: Record<Tier, string | boolean>;
  pro: string | boolean;
}

const ROWS: Row[] = [
  { label: "Free delivery", tiers: { base: "Above ₹999", silver: "Standard", gold: "Express", platinum: "Same-day" }, pro: "Every order" },
  { label: "Flash sale access", tiers: { base: "On time", silver: "24h early", gold: "24h early", platinum: "24h early" }, pro: "2h early + Pro prices" },
  { label: "Pro-only prices", tiers: { base: false, silver: false, gold: false, platinum: false }, pro: true },
  { label: "Exclusive coupons", tiers: { base: "Welcome", silver: "Welcome", gold: "Gold launches", platinum: "VIP events" }, pro: "Monthly Pro codes" },
  { label: "Points multiplier", tiers: { base: "1×", silver: "1.5×", gold: "2×", platinum: "3×" }, pro: "Your tier + bonus days" },
  { label: "Priority support", tiers: { base: false, silver: false, gold: true, platinum: "Beauty advisor" }, pro: true },
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto h-4 w-4 text-success" aria-label="Included" />;
  if (v === false) return <Minus className="mx-auto h-4 w-4 text-text-tertiary" aria-label="Not included" />;
  return <span>{v}</span>;
}

/** S44 comparison: loyalty tiers (earned by spend) vs GLAM Pro (paid, stacks with your tier). */
export function ProBenefitsTable({ currentTier }: { currentTier: Tier | null }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border">
      <table className="w-full min-w-[40rem] text-sm">
        <caption className="sr-only">GLAM Pro benefits compared with loyalty tiers</caption>
        <thead className="bg-surface text-left text-xs uppercase tracking-wide text-text-tertiary">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">
              Benefit
            </th>
            {TIER_ORDER.map((t) => (
              <th key={t} scope="col" className={`px-3 py-2 text-center font-semibold ${t === currentTier ? "text-primary" : ""}`}>
                {TIER_LABEL[t]}
                {t === currentTier && <span className="block text-[10px] normal-case">you</span>}
              </th>
            ))}
            <th scope="col" className="bg-secondary-soft px-3 py-2 text-center font-semibold text-secondary">
              GLAM Pro
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ROWS.map((r) => (
            <tr key={r.label}>
              <th scope="row" className="px-3 py-2.5 text-left font-medium text-text">
                {r.label}
              </th>
              {TIER_ORDER.map((t) => (
                <td key={t} className="px-3 py-2.5 text-center text-text-secondary">
                  <Cell v={r.tiers[t]} />
                </td>
              ))}
              <td className="bg-secondary-soft/60 px-3 py-2.5 text-center font-semibold text-secondary">
                <Cell v={r.pro} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
