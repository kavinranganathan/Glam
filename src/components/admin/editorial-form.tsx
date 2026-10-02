"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { EditorialRow } from "@/lib/admin/merch";
import { useAdminApi } from "./use-admin-api";

interface Props {
  open: boolean;
  initial: EditorialRow | null;
  onClose: () => void;
}

/** Create / edit an editorial ("GLAM Edit") card. */
export function EditorialForm({ open, initial, onClose }: Props) {
  const { call, busy } = useAdminApi();
  const [form, setForm] = React.useState(() => toForm(initial));
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      title: form.title,
      excerpt: form.excerpt || null,
      image_url: form.image_url,
      href: form.href || "/",
      position: Number(form.position) || 0,
      is_active: form.is_active,
    };
    const res = initial
      ? await call("PATCH", `/api/admin/editorial/${initial.id}`, body, { success: "Card updated" })
      : await call("POST", "/api/admin/editorial", body, { success: "Card created" });
    if (res) onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={initial ? "Edit editorial card" : "New editorial card"} size="md">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Input label="Title" required maxLength={120} value={form.title} onChange={(e) => set("title", e.target.value)} />
        <Textarea label="Excerpt" maxLength={300} value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} className="[&_textarea]:min-h-20" />
        <Input label="Image URL" type="url" required value={form.image_url} onChange={(e) => set("image_url", e.target.value)} />
        {form.image_url && (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an arbitrary remote URL
          <img src={form.image_url} alt="Card preview" className="h-32 w-full rounded-card border border-border object-cover" />
        )}
        <Input label="Link (href)" value={form.href} onChange={(e) => set("href", e.target.value)} placeholder="/c/skincare" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Position" type="number" min={0} max={999} value={form.position} onChange={(e) => set("position", e.target.value)} />
          <div className="flex items-end pb-3">
            <Checkbox label="Active" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {initial ? "Save changes" : "Create card"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

function toForm(c: EditorialRow | null) {
  return {
    title: c?.title ?? "",
    excerpt: c?.excerpt ?? "",
    image_url: c?.image_url ?? "",
    href: c?.href ?? "/",
    position: String(c?.position ?? 0),
    is_active: c?.is_active ?? true,
  };
}
