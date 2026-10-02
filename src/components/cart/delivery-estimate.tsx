"use client";

import * as React from "react";
import { MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatShortDate } from "@/lib/utils/dates";

interface PincodeInfo {
  city: string;
  state: string;
  codAvailable: boolean;
  sameDay: boolean;
  nextDay: boolean;
}

export function DeliveryEstimate({
  pincode,
  onPincode,
  eta,
  deliveryLabel,
}: {
  pincode: string | null;
  onPincode: (pincode: string | null) => void;
  /** ISO timestamp of the standard-slot estimate for this pincode. */
  eta: string | null;
  deliveryLabel: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [infoFor, setInfoFor] = React.useState<{ pincode: string; info: PincodeInfo | null } | null>(null);
  const info = infoFor && infoFor.pincode === pincode ? infoFor.info : null;

  React.useEffect(() => {
    if (!pincode) return;
    let cancelled = false;
    fetch(`/api/pincode/${pincode}`)
      .then(async (res) => (res.ok ? ((await res.json()) as PincodeInfo) : null))
      .then((data) => {
        if (!cancelled) setInfoFor({ pincode, info: data });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pincode]);

  const check = async () => {
    if (!/^\d{6}$/.test(value)) {
      setError("Enter a valid 6-digit pincode");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/pincode/${value}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Sorry, we don't deliver to this pincode yet." : "Couldn't check this pincode. Please try again.");
        return;
      }
      onPincode(value);
      setEditing(false);
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Delivery estimate" className="rounded-card border border-border bg-surface px-4 py-3">
      {pincode && !editing ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-semibold text-text">
                Deliver to {pincode}
                {info ? ` · ${info.city}` : ""}
              </p>
              <p className="flex items-center gap-1 text-text-secondary">
                <Truck className="h-4 w-4" aria-hidden />
                {eta ? `Get it by ${formatShortDate(eta)}` : "Standard delivery"} · {deliveryLabel === "Free" ? "Free delivery" : `Delivery ${deliveryLabel}`}
              </p>
              {info && !info.codAvailable && <p className="text-xs text-warning">Cash on Delivery not available here</p>}
            </div>
          </div>
          <button type="button" onClick={() => setEditing(true)} className="min-h-[44px] text-sm font-semibold text-primary">
            Change
          </button>
        </div>
      ) : (
        <form
          className="flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void check();
          }}
        >
          <Input
            label="Delivery pincode"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={value}
            onChange={(e) => {
              setValue(e.target.value.replace(/\D/g, "").slice(0, 6));
              if (error) setError(null);
            }}
            placeholder="Enter 6-digit pincode"
            error={error ?? undefined}
            hint={!error ? "See delivery dates and charges for your area" : undefined}
            className="flex-1"
            leading={<MapPin className="h-4 w-4" aria-hidden />}
          />
          <Button type="submit" variant="outline" loading={busy} className="mt-[26px]">
            Check
          </Button>
          {pincode && (
            <Button type="button" variant="ghost" className="mt-[26px]" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </form>
      )}
    </section>
  );
}
