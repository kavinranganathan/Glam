"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { filtersToSearchParams } from "@/lib/catalogue/search";
import type { ListFilters } from "@/lib/catalogue/types";
import { track } from "@/lib/analytics/track";

/**
 * Pushes a filter set into the URL (the source of truth for PLP state). Page resets to 1.
 * On `/c/[slug]` the category lives in the path, so the `category` key is dropped from the query.
 */
export function useFilterNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const apply = useCallback(
    (next: ListFilters, meta?: { facet?: string; value?: string | number | boolean | string[] }) => {
      const sp = filtersToSearchParams({ ...next, page: 1 });
      if (pathname.startsWith("/c/")) sp.delete("category");
      const qs = sp.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
      if (meta?.facet) {
        track("filter_applied", {
          facet: meta.facet,
          value: Array.isArray(meta.value) ? meta.value : (meta.value ?? null),
          path: pathname,
        });
      }
    },
    [pathname, router],
  );

  return { apply, pending };
}
