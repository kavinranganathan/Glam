"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { BannerRow } from "@/lib/admin/merch";
import { isoToLocalInput, localInputToIso } from "./form-utils";
import { useAdminApi } from "./use-admin-api";

interface Props {
  open: boolean;
  initial: BannerRow | null;
  onClose: () => void;
}

function ImagePreview({ url }: { url: string }) {
  if (!url) return <div className="flex h-32 items-center justify-center rounded-card border border-dashed border-border text-xs text-text-tertiary">Image preview</div>;
  // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary remote URL
  return <img src={url} alt="Banner preview" className="h-32 w-full rounded-card border border-border object-cover" />;
}

/** Create / edit a home banner. Opens in a side sheet. */
export function BannerForm({ open, initial, onClose }: Props) {
  const { call, busy } = useAdminApi();
  const [form, setForm] = React.useState(() => toForm(initial));
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: form.image_url,
      cta_label: form.cta_label || "Shop now",
      href: form.href || "/",
      position: Number(form.position) || 0,
      is_active: form.is_active,
      starts_at: localInputToIso(form.starts_at),
      ends_at: localInputToIso(form.ends_at),
    };
    const res = initial
      ? await call("PATCH", `/api/admin/banners/${initial.id}`, body, { success: "Banner updated" })
      : await call("POST", "/api/admin/banners", body, { success: "Banner created" });
    if (res) onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Edit banner" : "New banner"} size="md">
      <form id="banner-form" onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Title" required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} />
        <Input label="Subtitle" maxLength={200} value={form.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
        <Input label="Image URL" type="url" required value={form.image_url} onChange={(e) => set("image_url", e.target.value)} hint="Paste a hosted image URL (1600×700 recommended)." />
        <ImagePreview url={form.image_url} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="CTA label" maxLength={40} value={form.cta_label} onChange={(e) => set("cta_label", e.target.value)} />
          <Input label="Link (href)" value={form.href} onChange={(e) => set("href", e.target.value)} placeholder="/c/skincare" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Position" type="number" min={0} max={999} value={form.position} onChange={(e) => set("position", e.target.value)} />
          <div className="flex items-end pb-3">
            <Checkbox label="Active" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Starts at" type="datetime-local" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
          <Input label="Ends at" type="datetime-local" value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {initial ? "Save changes" : "Create banner"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function toForm(b: BannerRow | null) {
  return {
    title: b?.title ?? "",
    subtitle: b?.subtitle ?? "",
    image_url: b?.image_url ?? "",
    cta_label: b?.cta_label ?? "Shop now",
    href: b?.href ?? "/",
    position: String(b?.position ?? 0),
    is_active: b?.is_active ?? true,
    starts_at: isoToLocalInput(b?.starts_at),
    ends_at: isoToLocalInput(b?.ends_at),
  };
}
