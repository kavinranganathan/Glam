"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import type { BannerRow, EditorialRow } from "@/lib/admin/merch";
import { formatDateTime } from "@/lib/utils/dates";
import { BannerForm } from "./banner-form";
import { DataTable, type Column } from "./data-table";
import { EditorialForm } from "./editorial-form";
import { useAdminApi } from "./use-admin-api";

type Tab = "banners" | "editorial";

/** Position input that PATCHes on blur/Enter — the "reorder via position inputs" control. */
function PositionInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [v, setV] = React.useState(String(value));
  const commit = () => {
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n !== value) onCommit(n);
    else setV(String(value));
  };
  return (
    <input
      type="number"
      min={0}
      aria-label="Position"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-9 w-16 rounded-input border border-border bg-background px-2 text-sm tabular-nums"
    />
  );
}

function Thumb({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail of an arbitrary remote URL
  return <img src={src} alt={alt} className="h-10 w-20 rounded border border-border object-cover" />;
}

export function BannersManager({ banners, editorial }: { banners: BannerRow[]; editorial: EditorialRow[] }) {
  const { call, busy } = useAdminApi();
  const [tab, setTab] = React.useState<Tab>("banners");
  const [bannerEdit, setBannerEdit] = React.useState<{ open: boolean; row: BannerRow | null }>({ open: false, row: null });
  const [cardEdit, setCardEdit] = React.useState<{ open: boolean; row: EditorialRow | null }>({ open: false, row: null });

  const remove = (kind: Tab, id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    call("DELETE", `/api/admin/${kind}/${id}`, undefined, { success: "Deleted" });
  };
  const patch = (kind: Tab, id: string, body: Record<string, unknown>) => call("PATCH", `/api/admin/${kind}/${id}`, body, { success: "Saved" });

  const bannerCols: Column<BannerRow>[] = [
    { key: "pos", header: "Pos", render: (b) => <PositionInput key={`${b.id}-${b.position}`} value={b.position} onCommit={(n) => patch("banners", b.id, { position: n })} /> },
    { key: "img", header: "Image", render: (b) => <Thumb src={b.image_url} alt="" /> },
    {
      key: "title",
      header: "Title",
      render: (b) => (
        <div>
          <p className="font-semibold">{b.title}</p>
          {b.subtitle && <p className="text-xs text-text-tertiary">{b.subtitle}</p>}
          <p className="text-xs text-text-tertiary">
            {b.cta_label} → {b.href}
          </p>
        </div>
      ),
    },
    {
      key: "window",
      header: "Window",
      render: (b) => (
        <span className="text-xs text-text-secondary">
          {b.starts_at ? formatDateTime(b.starts_at) : "Always"} – {b.ends_at ? formatDateTime(b.ends_at) : "∞"}
        </span>
      ),
    },
    {
      key: "active",
      header: "Active",
      render: (b) => (
        <button type="button" disabled={busy} onClick={() => patch("banners", b.id, { is_active: !b.is_active })} aria-pressed={b.is_active} className="min-h-0">
          <Badge tone={b.is_active ? "success" : "neutral"}>{b.is_active ? "Active" : "Hidden"}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (b) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setBannerEdit({ open: true, row: b })}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-error" onClick={() => remove("banners", b.id, b.title)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const cardCols: Column<EditorialRow>[] = [
    { key: "pos", header: "Pos", render: (c) => <PositionInput key={`${c.id}-${c.position}`} value={c.position} onCommit={(n) => patch("editorial", c.id, { position: n })} /> },
    { key: "img", header: "Image", render: (c) => <Thumb src={c.image_url} alt="" /> },
    {
      key: "title",
      header: "Title",
      render: (c) => (
        <div>
          <p className="font-semibold">{c.title}</p>
          {c.excerpt && <p className="line-clamp-2 text-xs text-text-tertiary">{c.excerpt}</p>}
          <p className="text-xs text-text-tertiary">→ {c.href}</p>
        </div>
      ),
    },
    {
      key: "active",
      header: "Active",
      render: (c) => (
        <button type="button" disabled={busy} onClick={() => patch("editorial", c.id, { is_active: !c.is_active })} aria-pressed={c.is_active} className="min-h-0">
          <Badge tone={c.is_active ? "success" : "neutral"}>{c.is_active ? "Active" : "Hidden"}</Badge>
        </button>
      ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setCardEdit({ open: true, row: c })}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" className="text-error" onClick={() => remove("editorial", c.id, c.title)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs<Tab>
          tabs={[
            { value: "banners", label: "Banners", count: banners.length },
            { value: "editorial", label: "Editorial cards", count: editorial.length },
          ]}
          value={tab}
          onChange={setTab}
          className="border-b-0"
        />
        {tab === "banners" ? (
          <Button size="sm" onClick={() => setBannerEdit({ open: true, row: null })}>
            New banner
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCardEdit({ open: true, row: null })}>
            New card
          </Button>
        )}
      </div>
      {tab === "banners" ? (
        <DataTable columns={bannerCols} rows={banners} rowKey={(b) => b.id} caption="Banners" empty="No banners yet — create one to populate the home carousel." />
      ) : (
        <DataTable columns={cardCols} rows={editorial} rowKey={(c) => c.id} caption="Editorial cards" empty="No editorial cards yet." />
      )}
      {bannerEdit.open && <BannerForm key={bannerEdit.row?.id ?? "new"} open initial={bannerEdit.row} onClose={() => setBannerEdit((s) => ({ ...s, open: false }))} />}
      {cardEdit.open && <EditorialForm key={cardEdit.row?.id ?? "new"} open initial={cardEdit.row} onClose={() => setCardEdit((s) => ({ ...s, open: false }))} />}
    </div>
  );
}
