"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { Toggle } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

/** "Notify me about flash sales" — writes notification_prefs.offers. Guests are sent to login. */
export function FlashNotifyToggle({ initial, isLoggedIn }: { initial: boolean; isLoggedIn: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [on, setOn] = React.useState(initial);

  const change = async (next: boolean) => {
    if (!isLoggedIn) {
      router.push("/login?next=/flash-sale");
      return;
    }
    setOn(next);
    const res = await fetch("/api/me/notification-prefs", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offers: next }) });
    if (!res.ok) {
      setOn(!next);
      toast({ title: "Could not update preference", tone: "error" });
    } else {
      toast({ title: next ? "We'll ping you 30 min before the next flash sale" : "Flash sale alerts off", tone: "success" });
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-background px-4">
      <BellRing className="h-5 w-5 shrink-0 text-primary" aria-hidden />
      <div className="flex-1">
        <Toggle checked={on} onChange={change} label="Notify me about flash sales" description={isLoggedIn ? "Push alert 30 minutes before a sale goes live" : "Sign in to get flash sale alerts"} />
      </div>
    </div>
  );
}
