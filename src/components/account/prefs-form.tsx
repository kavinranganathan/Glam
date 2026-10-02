"use client";

import * as React from "react";
import { Moon } from "lucide-react";
import { Toggle } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export interface Prefs {
  orders: boolean;
  offers: boolean;
  reviews: boolean;
  loyalty: boolean;
  personalised: boolean;
}

type Key = Exclude<keyof Prefs, "orders">;

const CATEGORIES: Array<{ key: Key; label: string; description: string }> = [
  { key: "offers", label: "Offers", description: "Flash sales, coupons, price drops and abandoned-bag reminders" },
  { key: "reviews", label: "Reviews", description: "Prompts to review products you have received" },
  { key: "loyalty", label: "Loyalty", description: "Points earned, expiring points and tier changes" },
  { key: "personalised", label: "Personalised", description: "Weekly picks, brand launches and browse reminders" },
];

/** S42 notification preferences → PATCH /api/me/notification-prefs. Orders is locked on. */
export function PrefsForm({ initial }: { initial: Prefs }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = React.useState<Prefs>({ ...initial, orders: true });

  const update = async (key: Key, next: boolean) => {
    const prev = prefs;
    setPrefs((p) => ({ ...p, [key]: next }));
    const res = await fetch("/api/me/notification-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next }),
    });
    if (!res.ok) {
      setPrefs(prev);
      toast({ title: "Could not save preference", tone: "error" });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="divide-y divide-border rounded-card border border-border px-4">
        <Toggle checked label="Orders" description="Order confirmation, shipping and delivery updates. Always on — these are transactional." onChange={() => {}} disabled />
        {CATEGORIES.map((c) => (
          <Toggle key={c.key} checked={prefs[c.key]} onChange={(next) => update(c.key, next)} label={c.label} description={c.description} />
        ))}
      </div>
      <p className="flex items-start gap-2 rounded-card bg-surface p-3 text-sm text-text-secondary">
        <Moon className="mt-0.5 h-4 w-4 shrink-0 text-secondary" aria-hidden />
        <span>
          <strong className="text-text">Quiet hours 10 PM – 8 AM.</strong> We never send marketing pushes overnight. Order updates still arrive so you know where your parcel is.
        </span>
      </p>
      <p className="text-xs text-text-tertiary">Changes save instantly. Turning a category off stops push, email and SMS for it.</p>
    </div>
  );
}
