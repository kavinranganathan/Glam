"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Toggle } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";

export interface ProfileFormValues {
  name: string;
  phone: string;
  dob: string;
  avatarUrl: string;
  marketingConsent: boolean;
}

/** S36 Edit Profile → PATCH /api/me. Avatar is a URL field (no upload endpoint in this build). */
export function ProfileForm({ initial, email }: { initial: ProfileFormValues; email: string | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [v, setV] = React.useState(initial);
  const [errors, setErrors] = React.useState<Partial<Record<keyof ProfileFormValues, string>>>({});
  const [saving, setSaving] = React.useState(false);

  const set = <K extends keyof ProfileFormValues>(k: K, val: ProfileFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  const validate = () => {
    const e: typeof errors = {};
    if (v.name.trim().length < 2) e.name = "Enter at least 2 characters";
    if (v.phone && !/^[6-9]\d{9}$/.test(v.phone)) e.phone = "Enter a 10-digit Indian mobile number";
    if (v.avatarUrl && !/^https?:\/\//.test(v.avatarUrl)) e.avatarUrl = "Enter a full https:// URL";
    if (v.dob && new Date(v.dob) > new Date()) e.dob = "Date of birth cannot be in the future";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: v.name.trim(),
          phone: v.phone || null,
          dob: v.dob || null,
          avatar_url: v.avatarUrl || null,
          marketing_consent: v.marketingConsent,
        }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Could not save");
      toast({ title: "Profile updated", tone: "success" });
      router.push("/profile");
      router.refresh();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not save", tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  const initial1 = (v.name.trim()[0] ?? email?.[0] ?? "G").toUpperCase();

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      <div className="flex items-center gap-4">
        {v.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border border-border" />
        ) : (
          <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft font-display text-2xl font-bold text-primary">
            {initial1}
          </span>
        )}
        <div className="flex-1">
          <Input label="Avatar URL" placeholder="https://…" value={v.avatarUrl} onChange={(e) => set("avatarUrl", e.target.value)} error={errors.avatarUrl} inputMode="url" />
        </div>
      </div>
      <Input label="Full name" value={v.name} onChange={(e) => set("name", e.target.value)} error={errors.name} autoComplete="name" required />
      <Input label="Email" value={email ?? ""} readOnly disabled hint="Email is your sign-in and cannot be changed here." />
      <Input
        label="Mobile number"
        value={v.phone}
        onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
        error={errors.phone}
        inputMode="numeric"
        autoComplete="tel-national"
        leading={<span className="text-sm">+91</span>}
        hint="Used for delivery updates and callbacks"
      />
      <Input label="Date of birth" type="date" value={v.dob} onChange={(e) => set("dob", e.target.value)} error={errors.dob} hint="We send a birthday treat every year" />
      <div className="rounded-card border border-border px-4">
        <Toggle
          checked={v.marketingConsent}
          onChange={(next) => set("marketingConsent", next)}
          label="Marketing emails and offers"
          description="Flash sale alerts, personalised picks and coupons. Order updates are always sent."
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" loading={saving}>
          Save changes
        </Button>
        <Button type="button" variant="outline" href="/profile">
          Cancel
        </Button>
      </div>
    </form>
  );
}
