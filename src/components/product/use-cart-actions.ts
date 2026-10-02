"use client";

import * as React from "react";
import { useToast } from "@/components/ui/toast";
import { useBadges } from "@/components/layout/badges-provider";
import type { CartView } from "@/lib/cart/types";

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    return data.error?.message ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

/** Shared client helper for cart mutations with toasts and badge refresh. */
export function useCartActions() {
  const { toast } = useToast();
  const badges = useBadges();
  const [pending, setPending] = React.useState(false);

  const call = React.useCallback(
    async (input: RequestInfo, init?: RequestInit, successToast?: Parameters<typeof toast>[0]): Promise<CartView | null> => {
      setPending(true);
      try {
        const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
        if (!res.ok) {
          toast({ title: await readError(res), tone: "error" });
          return null;
        }
        const cart = (await res.json()) as CartView;
        badges.setCartCount(cart.itemCount);
        if (successToast) toast(successToast);
        return cart;
      } catch {
        toast({ title: "Network error. Please try again.", tone: "error" });
        return null;
      } finally {
        setPending(false);
      }
    },
    [toast, badges],
  );

  const addToBag = React.useCallback(
    (variantId: string, qty = 1, opts?: { silent?: boolean }) =>
      call(
        "/api/cart/items",
        { method: "POST", body: JSON.stringify({ variantId, qty }) },
        opts?.silent ? undefined : { title: "Added to bag", tone: "success", action: { label: "View bag", href: "/bag" } },
      ),
    [call],
  );

  const updateItem = React.useCallback(
    (itemId: string, patch: { qty?: number; savedForLater?: boolean }) =>
      call(`/api/cart/items/${itemId}`, { method: "PATCH", body: JSON.stringify(patch) }),
    [call],
  );

  const removeItem = React.useCallback((itemId: string) => call(`/api/cart/items/${itemId}`, { method: "DELETE" }), [call]);

  const applyCoupon = React.useCallback(
    (code: string) => call("/api/cart/coupon", { method: "PUT", body: JSON.stringify({ code }) }, { title: "Coupon applied", tone: "success" }),
    [call],
  );
  const removeCoupon = React.useCallback(() => call("/api/cart/coupon", { method: "DELETE" }), [call]);
  const setUsePoints = React.useCallback(
    (usePoints: boolean) => call("/api/cart/points", { method: "PUT", body: JSON.stringify({ usePoints }) }),
    [call],
  );

  return { pending, addToBag, updateItem, removeItem, applyCoupon, removeCoupon, setUsePoints, call };
}
