"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { FlashSaleView } from "@/lib/admin/merch";
import { defaultSalePrice, paiseToRupees, rupeesToPaise } from "@/lib/admin/rules";
import type { ProductCard } from "@/lib/catalogue/types";
import { formatINR } from "@/lib/utils/money";
import { isoToLocalInput, localInputToIso } from "./form-utils";
import { ProductPicker } from "./product-picker";
import { useAdminApi } from "./use-admin-api";

interface Item {
  productId: string;
  name: string;
  price: number;
  /** Rupees as typed. */
  saleRupees: string;
}

function toItems(sale: FlashSaleView | null): Item[] {
  return (sale?.items ?? []).map((i) => ({ productId: i.productId, name: i.name, price: i.price, saleRupees: String(paiseToRupees(i.salePrice)) }));
}

/** Create / edit a flash sale with a product picker; sale prices prefill at 30% off. */
export function FlashSaleForm({ open, initial, onClose }: { open: boolean; initial: FlashSaleView | null; onClose: () => void }) {
  const { call, busy } = useAdminApi();
  const [name, setName] = React.useState(initial?.name ?? "");
  const [startsAt, setStartsAt] = React.useState(() => isoToLocalInput(initial?.startsAt ?? new Date().toISOString()));
  const [endsAt, setEndsAt] = React.useState(() => isoToLocalInput(initial?.endsAt ?? new Date(Date.now() + 24 * 3600 * 1000).toISOString()));
  const [bannerUrl, setBannerUrl] = React.useState(initial?.bannerUrl ?? "");
  const [isActive, setIsActive] = React.useState(initial?.isActive ?? true);
  const [items, setItems] = React.useState<Item[]>(() => toItems(initial));

  const add = (p: ProductCard) =>
    setItems((cur) => (cur.some((i) => i.productId === p.id) ? cur : [...cur, { productId: p.id, name: p.name, price: p.price, saleRupees: String(paiseToRupees(defaultSalePrice(p.price))) }]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      name,
      starts_at: localInputToIso(startsAt),
      ends_at: localInputToIso(endsAt),
      banner_url: bannerUrl || null,
      is_active: isActive,
      items: items.map((i) => ({ product_id: i.productId, sale_price: rupeesToPaise(i.saleRupees) })),
    };
    const res = initial
      ? await call("PATCH", `/api/admin/flash-sales/${initial.id}`, body, { success: "Flash sale updated" })
      : await call("POST", "/api/admin/flash-sales", body, { success: "Flash sale created" });
    if (res) onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Edit flash sale" : "New flash sale"} size="lg">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Name" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Weekend Glow Sale" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Starts at" type="datetime-local" required value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          <Input label="Ends at" type="datetime-local" required value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <Input label="Banner URL (optional)" type="url" value={bannerUrl} onChange={(e) => setBannerUrl(e.target.value)} />
        <Checkbox label="Active (shown on the home page and PLPs while within the window)" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />

        <ProductPicker onPick={add} excludeIds={items.map((i) => i.productId)} />

        <div className="rounded-card border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">Sale items</caption>
            <thead className="bg-surface text-left text-xs uppercase text-text-tertiary">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2">Sale price (₹)</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Remove</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-text-tertiary">
                    No products yet — search above to add some.
                  </td>
                </tr>
              )}
              {items.map((it) => (
                <tr key={it.productId}>
                  <td className="px-3 py-2">{it.name}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-text-secondary">{formatINR(it.price)}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      aria-label={`Sale price for ${it.name} in rupees`}
                      value={it.saleRupees}
                      onChange={(e) => setItems((cur) => cur.map((x) => (x.productId === it.productId ? { ...x, saleRupees: e.target.value } : x)))}
                      className="h-9 w-28 rounded-input border border-border px-2 tabular-nums"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button type="button" size="sm" variant="ghost" className="text-error" onClick={() => setItems((cur) => cur.filter((x) => x.productId !== it.productId))}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {initial ? "Save changes" : "Create flash sale"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
