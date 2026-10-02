"use client";

import * as React from "react";
import Image from "next/image";
import { Play, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Lightbox } from "./lightbox";

type Slide = { kind: "image"; src: string } | { kind: "video"; src: string; poster: string };

/** PDP gallery (PRD §8.5.1): swipeable carousel with dots, thumbnail strip, zoom lightbox, muted video. */
export function Gallery({ images, videoUrl, alt, className }: { images: string[]; videoUrl?: string | null; alt: string; className?: string }) {
  const slides = React.useMemo<Slide[]>(() => {
    const list: Slide[] = images.map((src) => ({ kind: "image", src }));
    if (videoUrl) list.splice(1, 0, { kind: "video", src: videoUrl, poster: images[0] ?? "" });
    return list;
  }, [images, videoUrl]);
  const [index, setIndex] = React.useState(0);
  const [lightbox, setLightbox] = React.useState<number | null>(null);
  const [muted, setMuted] = React.useState(true);
  const trackRef = React.useRef<HTMLDivElement>(null);
  const thumbsRef = React.useRef<HTMLDivElement>(null);
  const touchStart = React.useRef<number | null>(null);

  const goTo = React.useCallback(
    (i: number) => {
      const next = (i + slides.length) % slides.length;
      setIndex(next);
      trackRef.current?.scrollTo({ left: next * (trackRef.current?.clientWidth ?? 0), behavior: "smooth" });
      thumbsRef.current?.children[next]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    [slides.length],
  );

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === "Enter" && slides[index]?.kind === "image") {
      setLightbox(imageIndexOf(index));
    }
  };

  const imageIndexOf = (slideIdx: number) => images.indexOf((slides[slideIdx] as { src: string }).src);

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={trackRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${alt} images`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        onTouchStart={(e) => (touchStart.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (start === null) return;
          const dx = (e.changedTouches[0]?.clientX ?? start) - start;
          if (Math.abs(dx) > 40) goTo(index + (dx < 0 ? 1 : -1));
        }}
        className="relative flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-card bg-surface scrollbar-none aspect-square w-full"
      >
        {slides.map((s, i) => (
          <div key={`${s.kind}-${s.src}`} className="relative h-full w-full shrink-0 snap-center" aria-hidden={i !== index}>
            {s.kind === "image" ? (
              <button
                type="button"
                onClick={() => setLightbox(imageIndexOf(i))}
                aria-label={`Zoom image ${images.indexOf(s.src) + 1} of ${images.length}`}
                className="relative block h-full w-full cursor-zoom-in min-h-0"
              >
                <Image src={s.src} alt={`${alt} — image ${images.indexOf(s.src) + 1}`} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" priority={i === 0} />
              </button>
            ) : (
              <div className="relative h-full w-full bg-black">
                <video
                  src={s.src}
                  poster={s.poster}
                  muted={muted}
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-contain"
                  aria-label={`${alt} video`}
                />
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute video" : "Mute video"}
                  aria-pressed={!muted}
                  className="absolute bottom-3 right-3 rounded-full bg-black/60 p-2.5 text-white"
                >
                  {muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <>
          <div className="flex justify-center gap-1.5 lg:hidden" role="tablist" aria-label="Choose image">
            {slides.map((s, i) => (
              <button
                key={`dot-${i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to ${s.kind === "video" ? "video" : `image ${i + 1}`}`}
                onClick={() => goTo(i)}
                className="min-h-0 p-1.5"
              >
                <span className={cn("block h-2 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-2 bg-border")} />
              </button>
            ))}
          </div>
          <div ref={thumbsRef} className="flex gap-2 overflow-x-auto scrollbar-none" role="tablist" aria-label="Thumbnails">
            {slides.map((s, i) => (
              <button
                key={`thumb-${i}`}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={s.kind === "video" ? "Play video" : `Show image ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-card border-2 bg-surface min-h-0 basis-[calc(20%-0.4rem)]",
                  i === index ? "border-primary" : "border-transparent",
                )}
              >
                <Image src={s.kind === "video" ? s.poster : s.src} alt="" fill sizes="64px" className="object-cover" />
                {s.kind === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                    <Play className="h-5 w-5" fill="currentColor" aria-hidden />
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {lightbox !== null && images.length > 0 && (
        <Lightbox images={images} index={Math.max(0, lightbox)} onIndexChange={setLightbox} onClose={() => setLightbox(null)} alt={alt} />
      )}
    </div>
  );
}
