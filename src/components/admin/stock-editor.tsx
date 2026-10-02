"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/input";
import type { AdminProduct, AdminVariant } from "@/lib/admin/catalogue";
import { LOW_STOCK_THRESHOLD, paiseToRupees, rupeesToPaise } from "@/lib/admin/rules";
import { useAdminApi } from "./use-admin-api";

const inputCls = "h-9 w-24 rounded-input border border-border bg-background px-2 text-sm tabular-nums";

function StockRow({ v }: { v: AdminVariant }) {
  const { call, busy } = useAdminApi();
  const [stock, setStock] = React.useState(String(v.stock));
  const dirty = Number(stock) !== v.stock;
  const save = async () => {
    const n = Number(stock);
    if (!Number.isInteger(n) || n < 0) return;
    const res = await call<{ notified: number }>("PATCH", `/api/admin/variants/${v.id}`, { stock: n }, { success: "Stock updated" });
    if (res && res.notified > 0) window.alert(`${res.notified} back-in-stock alert${res.notified > 1 ? "s" : ""} sent.`);
  };
  return (
    <tr>
      <td className="px-3 py-1.5">
        <p>{v.name}</p>
        <p className="font-mono text-[11px] text-text-tertiary">{v.sku}</p>
      </td>
      <td className="px-3 py-1.5">
        {v.stock === 0 ? <Badge tone="error">Out</Badge> : v.stock <= LOW_STOCK_THRESHOLD ? <Badge tone="warning">Low</Badge> : <Badge tone="success">OK</Badge>}
      </td>
      <td className="px-3 py-1.5">
        <input type="number" min={0} aria-label={`Stock for ${v.name}`} value={stock} onChange={(e) => setStock(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} className={inputCls} />
      </td>
      <td className="px-3 py-1.5 text-right">
        <Button size="sm" variant={dirty ? "primary" : "ghost"} disabled={!dirty || busy} onClick={save}>
          Save
        </Button>
      </td>
    </tr>
  );
}

function PricingEditor({ p }: { p: AdminProduct }) {
  const { call, busy } = useAdminApi();
  const [price, setPrice] = React.useState(String(paiseToRupees(p.price)));
  const [mrp, setMrp] = React.useState(String(paiseToRupees(p.mrp)));
  const [pro, setPro] = React.useState(p.proPrice != null ? String(paiseToRupees(p.proPrice)) : "");
  const [active, setActive] = React.useState(p.isActive);
  const save = async () => {
    const body = {
      price: rupeesToPaise(price),
      mrp: rupeesToPaise(mrp),
      pro_price: pro.trim() ? rupeesToPaise(pro) : null,
      is_active: active,
    };
    const res = await call<{ notified: number }>("PATCH", `/api/admin/products/${p.id}`, body, { success: "Pricing updated" });
    if (res && res.notified > 0) window.alert(`${res.notified} price-drop alert${res.notified > 1 ? "s" : ""} sent.`);
  };
  return (
    <div className="flex flex-wrap items-end gap-3 text-sm">
      <label className="flex flex-col gap-1 text-xs text-text-tertiary">
        Price (₹)
        <input type="number" min={1} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-tertiary">
        MRP (₹)
        <input type="number" min={1} step="0.01" value={mrp} onChange={(e) => setMrp(e.target.value)} className={inputCls} />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text-tertiary">
        Pro price (₹)
        <input type="number" min={1} step="0.01" value={pro} onChange={(e) => setPro(e.target.value)} placeholder="—" className={inputCls} />
      </label>
      <Checkbox label="Active" checked={active} onChange={(e) => setActive(e.target.checked)} className="pb-2" />
      <Button size="sm" variant="outline" disabled={busy} onClick={save}>
        Save pricing
      </Button>
    </div>
  );
}

/** Product cards with inline stock + pricing editing. */
export function StockEditor({ products }: { products: AdminProduct[] }) {
  if (!products.length) return <p className="rounded-card border border-border p-8 text-center text-sm text-text-tertiary">No products match.</p>;
  return (
    <div className="flex flex-col gap-4">
      {products.map((p) => (
        <section key={p.id} aria-labelledby={`p-${p.id}`} className="rounded-card border border-border bg-background">
          <header className="flex flex-wrap items-start gap-3 border-b border-border p-3">
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element -- catalogue thumbnail
              <img src={p.image} alt="" className="h-12 w-12 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <h2 id={`p-${p.id}`} className="truncate font-semibold">
                <Link href={`/p/${p.slug}`} className="hover:underline">
                  {p.name}
                </Link>{" "}
                {!p.isActive && <Badge tone="neutral">Hidden</Badge>}
              </h2>
              <p className="text-xs text-text-tertiary">{p.brand}</p>
            </div>
            <PricingEditor p={p} />
          </header>
          <table className="w-full text-sm">
            <caption className="sr-only">Variants of {p.name}</caption>
            <thead className="text-left text-xs uppercase text-text-tertiary">
              <tr>
                <th className="px-3 py-1.5">Variant</th>
                <th className="px-3 py-1.5">State</th>
                <th className="px-3 py-1.5">Stock</th>
                <th className="px-3 py-1.5">
                  <span className="sr-only">Save</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {p.variants.map((v) => (
                <StockRow key={`${v.id}-${v.stock}`} v={v} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
