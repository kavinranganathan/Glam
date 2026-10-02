"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics/track";
import type { AnalyticsEvent, AnalyticsProps } from "@/lib/analytics/events";

/** Fires `screen_view` on route change plus `app_open` once per session. */
export function ScreenViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      if (!sessionStorage.getItem("glam_app_open")) {
        sessionStorage.setItem("glam_app_open", "1");
        track("app_open", { source: document.referrer ? "referral" : "organic" });
      }
    } catch {}
    track("screen_view", { screen_name: pathname });
  }, [pathname]);
  return null;
}

/** Fire a single event on mount (e.g. product_detail_viewed). */
export function TrackOnMount({ event, props }: { event: AnalyticsEvent; props: AnalyticsProps }) {
  useEffect(() => {
    track(event, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
