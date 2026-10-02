"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils/cn";
import {
  BUDGETS,
  CONCERNS,
  HAIR_TYPES,
  SHOPPING_FOR,
  SKIN_TONES,
  SKIN_TYPES,
  STYLE_PREFS,
  profileCompletion,
  type BeautyProfileInput,
} from "@/lib/account/beauty-profile";

const EMPTY: BeautyProfileInput = { skinType: null, skinTone: null, concerns: [], hairType: null, shoppingFor: [], stylePrefs: [], budget: null };

const STEPS = ["skinType", "skinTone", "concerns", "hairType", "shoppingFor", "stylePrefs", "budget"] as const;
type StepKey = (typeof STEPS)[number];

const TITLES: Record<StepKey, { q: string; hint: string }> = {
  skinType: { q: "What is your skin type?", hint: "Pick one" },
  skinTone: { q: "What is your skin tone?", hint: "Choose the closest swatch" },
  concerns: { q: "Your primary skin concerns?", hint: "Pick all that apply" },
  hairType: { q: "Hair type?", hint: "Pick one" },
  shoppingFor: { q: "Who are you shopping for?", hint: "Pick all that apply" },
  stylePrefs: { q: "Style preferences?", hint: "Pick up to 3" },
  budget: { q: "Budget per order?", hint: "Helps us show the right picks" },
};

/** 7-question beauty profile (PRD §8.1.4). Each step skippable; progress bar; welcome coupon on first save. */
export function BeautyProfileForm({
  initial,
  welcome,
  next,
  userName,
}: {
  initial: BeautyProfileInput | null;
  welcome: boolean;
  next: string | null;
  userName: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const editMode = Boolean(initial) && !welcome;
  const [p, setP] = React.useState<BeautyProfileInput>(initial ?? EMPTY);
  const [step, setStep] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [done, setDone] = React.useState<{ couponCode: string | null; first: boolean } | null>(null);

  const key = STEPS[step];
  const completion = profileCompletion(p);
  const toggle = (field: "concerns" | "shoppingFor" | "stylePrefs", v: string, max?: number) =>
    setP((prev) => {
      const cur = prev[field] ?? [];
      if (cur.includes(v)) return { ...prev, [field]: cur.filter((x) => x !== v) };
      if (max && cur.length >= max) return prev;
      return { ...prev, [field]: [...cur, v] };
    });

  const save = async (final: boolean) => {
    setSaving(true);
    try {
      const res = await fetch("/api/me/beauty-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error?.message ?? "Couldn't save", tone: "error" });
        return;
      }
      if (final) {
        if (editMode) {
          toast({ title: "Beauty profile updated", tone: "success" });
          router.push("/profile");
          router.refresh();
        } else {
          setDone({ couponCode: data.couponCode, first: data.firstCompletion });
          router.refresh();
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-background p-8 text-center shadow-card animate-fade-up">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Gift className="h-10 w-10" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-bold">You&apos;re all set{userName ? `, ${userName.split(" ")[0]}` : ""}!</h1>
        <p className="text-text-secondary">Your feed is now personalised to your skin and style.</p>
        {done.couponCode && (
          <div className="w-full rounded-card border-2 border-dashed border-primary bg-primary-soft p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Welcome gift · 15% off first order (max ₹300)</p>
            <p className="mt-1 font-mono text-xl font-bold text-text">{done.couponCode}</p>
            <button
              className="mt-1 text-sm font-semibold text-primary min-h-0"
              onClick={() => {
                navigator.clipboard?.writeText(done.couponCode!);
                toast({ title: "Code copied", tone: "success" });
              }}
            >
              Copy code
            </button>
          </div>
        )}
        <Button size="lg" fullWidth href={next ?? "/"}>
          Start shopping
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-5 shadow-card md:p-8">
      <div className="mb-6">
        {welcome && (
          <p className="mb-2 inline-flex items-center gap-1 rounded-pill bg-secondary-soft px-3 py-1 text-xs font-semibold text-secondary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden /> About 3 minutes · unlocks 15% off
          </p>
        )}
        <h1 className="font-display text-2xl font-bold">{editMode ? "Edit your beauty profile" : "Tell us about you"}</h1>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(completion, ((step + 1) / STEPS.length) * 100 * 0.14)}%` }} />
          </div>
          <span className="text-xs font-semibold text-text-tertiary">{completion}% complete</span>
        </div>
      </div>

      <div key={key} className="animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          Question {step + 1} of {STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-xl font-semibold">{TITLES[key].q}</h2>
        <p className="mb-4 text-sm text-text-tertiary">{TITLES[key].hint}</p>

        {key === "skinType" && (
          <div className="flex flex-wrap gap-2">
            {SKIN_TYPES.map((o) => (
              <Chip key={o.value} selected={p.skinType === o.value} onClick={() => setP({ ...p, skinType: o.value })}>
                {o.label}
              </Chip>
            ))}
          </div>
        )}
        {key === "skinTone" && (
          <div className="grid grid-cols-6 gap-3" role="radiogroup" aria-label="Skin tone">
            {SKIN_TONES.map((hex, i) => {
              const v = i + 1;
              const sel = p.skinTone === v;
              return (
                <button
                  key={hex}
                  type="button"
                  role="radio"
                  aria-checked={sel}
                  aria-label={`Tone ${v} of 12`}
                  onClick={() => setP({ ...p, skinTone: v })}
                  className={cn("relative aspect-square rounded-xl border-2 transition", sel ? "border-primary ring-2 ring-primary/30 scale-105" : "border-transparent")}
                  style={{ background: hex }}
                >
                  {sel && <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow" aria-hidden />}
                </button>
              );
            })}
          </div>
        )}
        {key === "concerns" && (
          <div className="flex flex-wrap gap-2">
            {CONCERNS.map((c) => (
              <Chip key={c} selected={p.concerns?.includes(c)} onClick={() => toggle("concerns", c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}
        {key === "hairType" && (
          <div className="flex flex-wrap gap-2">
            {HAIR_TYPES.map((o) => (
              <Chip key={o.value} selected={p.hairType === o.value} onClick={() => setP({ ...p, hairType: o.value })}>
                {o.label}
              </Chip>
            ))}
          </div>
        )}
        {key === "shoppingFor" && (
          <div className="flex flex-wrap gap-2">
            {SHOPPING_FOR.map((c) => (
              <Chip key={c} selected={p.shoppingFor?.includes(c)} onClick={() => toggle("shoppingFor", c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}
        {key === "stylePrefs" && (
          <div className="grid grid-cols-3 gap-3">
            {STYLE_PREFS.map((s, i) => {
              const sel = p.stylePrefs?.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => toggle("stylePrefs", s, 3)}
                  className={cn(
                    "relative aspect-[4/5] overflow-hidden rounded-card border-2 text-left",
                    sel ? "border-primary ring-2 ring-primary/30" : "border-border",
                  )}
                >
                  <span
                    className="absolute inset-0"
                    style={{ background: `linear-gradient(160deg, hsl(${(i * 55 + 320) % 360} 70% 85%), hsl(${(i * 55 + 20) % 360} 60% 70%))` }}
                    aria-hidden
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-sm font-semibold text-white">{s}</span>
                  {sel && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                      <Check className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {key === "budget" && (
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((o) => (
              <Chip key={o.value} selected={p.budget === o.value} onClick={() => setP({ ...p, budget: o.value })}>
                {o.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        <div className="flex items-center gap-2">
          {step < STEPS.length - 1 ? (
            <>
              <Button variant="ghost" onClick={() => setStep((s) => s + 1)}>
                Skip
              </Button>
              <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
            </>
          ) : (
            <Button onClick={() => save(true)} loading={saving}>
              {editMode ? "Save changes" : "Finish"}
            </Button>
          )}
        </div>
      </div>
      {!editMode && (
        <div className="mt-4 text-center">
          <button
            type="button"
            className="text-sm font-semibold text-text-tertiary min-h-0"
            onClick={async () => {
              if (completion > 0) await save(true);
              else router.push(next ?? "/");
            }}
          >
            Skip for now
          </button>
        </div>
      )}
    </div>
  );
}
