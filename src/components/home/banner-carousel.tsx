"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerView } from "@/lib/catalogue/types";
import { cn } from "@/lib/utils/cn";

const AUTO_ADVANCE_MS = 4000;
const RESUME_AFTER_MS = 5000;
const SWIPE_PX = 40;

/** Hero banner carousel (PRD §8.2.2 #1): 16:9, auto-advance 4s, pauses on interaction, swipe, dots. */
export function BannerCarousel({ banners }: { banners: BannerView[] }) {
  const n = banners.length;
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const resumeTimer = React.useRef<number | null>(null);
  const touchStartX = React.useRef<number | null>(null);

  const go = React.useCallback((i: number) => setIndex(((i % n) + n) % n), [n]);

  /** Any interaction pauses auto-advance; it resumes after 5s idle. */
  const interact = React.useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), RESUME_AFTER_MS);
  }, []);

  React.useEffect(() => {
    if (paused || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % n), AUTO_ADVANCE_MS);
    return () => window.clearInterval(id);
  }, [paused, n]);

  React.useEffect(
    () => () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    },
    [],
  );

  if (!n) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="relative"
      onMouseEnter={interact}
      onFocusCapture={interact}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        interact();
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start === null) return;
        const dx = (e.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(dx) > SWIPE_PX) go(index + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-surface md:aspect-[21/9] lg:rounded-card">
        <div
          className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {banners.map((b, i) => (
            <div
              key={b.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${n}`}
              aria-hidden={i !== index}
              className="relative h-full w-full shrink-0"
            >
              <Image src={b.imageUrl} alt={b.title} fill priority={i === 0} sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-8">
                <h2 className="font-display text-xl font-bold drop-shadow md:text-3xl">{b.title}</h2>
                {b.subtitle && <p className="mt-1 max-w-md text-sm text-white/90 md:text-base">{b.subtitle}</p>}
                <Link
                  href={b.href}
                  tabIndex={i === index ? 0 : -1}
                  className="btn mt-3 inline-flex h-11 items-center rounded-pill bg-white px-5 text-sm font-semibold text-text hover:bg-primary-soft"
                >
                  {b.ctaLabel}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            onClick={() => {
              go(index - 1);
              interact();
            }}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-text shadow hover:bg-white md:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => {
              go(index + 1);
              interact();
            }}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-text shadow hover:bg-white md:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          <div role="tablist" aria-label="Choose slide" className="absolute inset-x-0 bottom-0 flex justify-center">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}: ${b.title}`}
                onClick={() => {
                  go(i);
                  interact();
                }}
                className="flex h-11 w-7 items-center justify-center"
              >
                <span className={cn("h-1.5 rounded-full bg-white/60 transition-all", i === index ? "w-5 bg-white" : "w-1.5")} aria-hidden />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
