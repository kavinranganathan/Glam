"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useLocalStorageFlag } from "@/lib/hooks/use-local-storage-flag";

const SLIDES = [
  {
    title: "Discover What Works for You",
    copy: "Personalised picks for your skin type, tone & concerns",
    icon: Sparkles,
    art: (
      <div className="flex gap-1.5" aria-hidden>
        {["#f3dcc9", "#efd1b4", "#e5c09c", "#d8ab83", "#c9976b", "#b87f57", "#a66a45", "#8a5436", "#6b3f28", "#4f2d1c"].map((c) => (
          <span key={c} className="h-10 w-5 rounded-full" style={{ background: c }} />
        ))}
      </div>
    ),
  },
  {
    title: "Verified Brands. Real Reviews.",
    copy: "Every product authenticated. Every review from a real buyer.",
    icon: BadgeCheck,
    art: (
      <div className="flex items-center gap-2 text-amber-500 text-3xl" aria-hidden>
        ★★★★★
      </div>
    ),
  },
  {
    title: "Beauty Delivered Fast",
    copy: "Same-day delivery in 12 cities. 30-day easy returns.",
    icon: Truck,
    art: <div className="h-16 w-24 rounded-card bg-primary-soft border-2 border-dashed border-primary/40" aria-hidden />,
  },
];

const KEY = "glam_onboarded";

/** First-visit onboarding (PRD S02). Shown once; suppressed afterwards via localStorage. */
export function OnboardingCarousel({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [onboarded, setOnboarded] = useLocalStorageFlag(KEY, true);
  const [dismissed, setDismissed] = React.useState(false);
  const open = !isLoggedIn && !onboarded && !dismissed;
  const [i, setI] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % SLIDES.length), 4000);
    return () => clearInterval(t);
  }, [open]);

  const finish = () => {
    setOnboarded(true);
    setDismissed(true);
  };

  if (!open) return null;
  const slide = SLIDES[i];
  const Icon = slide.icon;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Welcome to GLAM">
      <div className="flex justify-end p-4">
        <button onClick={finish} className="text-sm font-semibold text-text-tertiary">
          Skip
        </button>
      </div>
      <div
        className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center animate-fade-up"
        key={i}
        onTouchStart={(e) => (e.currentTarget.dataset.x = String(e.touches[0].clientX))}
        onTouchEnd={(e) => {
          const start = Number(e.currentTarget.dataset.x ?? 0);
          const dx = e.changedTouches[0].clientX - start;
          if (dx < -40) setI((x) => Math.min(SLIDES.length - 1, x + 1));
          if (dx > 40) setI((x) => Math.max(0, x - 1));
        }}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-12 w-12" aria-hidden />
        </div>
        {slide.art}
        <h1 className="font-display text-3xl font-bold text-text">{slide.title}</h1>
        <p className="max-w-xs text-text-secondary">{slide.copy}</p>
      </div>
      <div className="flex flex-col items-center gap-6 p-8 pb-safe">
        <div className="flex gap-2" role="tablist" aria-label="Slides">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              role="tab"
              aria-selected={idx === i}
              aria-label={`Slide ${idx + 1}`}
              onClick={() => setI(idx)}
              className={cn("h-2 rounded-full transition-all min-h-0", idx === i ? "w-6 bg-primary" : "w-2 bg-border")}
            />
          ))}
        </div>
        {i === SLIDES.length - 1 ? (
          <Button size="lg" fullWidth href="/login" onClick={finish} className="max-w-sm">
            Get Started
          </Button>
        ) : (
          <Button size="lg" fullWidth onClick={() => setI((x) => x + 1)} className="max-w-sm">
            Next
          </Button>
        )}
        <button onClick={finish} className="text-sm font-semibold text-text-secondary">
          Browse as guest
        </button>
      </div>
    </div>,
    document.body,
  );
}
