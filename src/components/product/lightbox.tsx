"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const noopSubscribe = () => () => {};

/**
 * Full-screen image viewer: arrow keys / swipe to move, wheel or pinch to zoom (CSS transform),
 * double-tap toggles 1x ↔ 2.5x, drag to pan while zoomed.
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
  alt,
}: {
  images: string[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  alt: string;
}) {
  const mounted = React.useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [scale, setScale] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const drag = React.useRef<{ x: number; y: number; ox: number; oy: number; moved: boolean } | null>(null);
  const lastTap = React.useRef(0);
  const pinch = React.useRef<number | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const reset = React.useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);
  const go = React.useCallback(
    (delta: number) => {
      onIndexChange((index + delta + images.length) % images.length);
      reset();
    },
    [index, images.length, onIndexChange, reset],
  );

  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  if (!mounted) return null;

  const toggleZoom = () => {
    if (scale > 1) reset();
    else setScale(2.5);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.current.moved = true;
    if (scale > 1) setOffset({ x: drag.current.ox + dx, y: drag.current.oy + dy });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (scale === 1 && Math.abs(dx) > 50) {
      go(dx < 0 ? 1 : -1);
      return;
    }
    if (!d.moved) {
      const now = Date.now();
      if (now - lastTap.current < 300) toggleZoom();
      lastTap.current = now;
    }
  };
  const onWheel = (e: React.WheelEvent) => {
    const next = Math.min(4, Math.max(1, scale - e.deltaY * 0.002));
    setScale(next);
    if (next === 1) setOffset({ x: 0, y: 0 });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const [a, b] = [e.touches[0], e.touches[1]];
    const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    if (pinch.current !== null) setScale((s) => Math.min(4, Math.max(1, s * (dist / (pinch.current as number)))));
    pinch.current = dist;
  };
  const onTouchEnd = () => {
    pinch.current = null;
  };

  return createPortal(
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`Image ${index + 1} of ${images.length}`}
      className="fixed inset-0 z-[70] flex flex-col bg-black text-white outline-none"
    >
      <div className="flex items-center justify-between p-3">
        <span className="text-sm">
          {index + 1} / {images.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-white/10">
          <X className="h-6 w-6" aria-hidden />
        </button>
      </div>
      <div
        className="relative flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onDoubleClick={toggleZoom}
        style={{ cursor: scale > 1 ? "grab" : "zoom-in" }}
      >
        <div
          className="absolute inset-0 transition-transform duration-150 ease-out"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          <Image src={images[index]} alt={`${alt} — image ${index + 1}`} fill sizes="100vw" className="object-contain" priority unoptimized />
        </div>
      </div>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70"
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next image"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 hover:bg-black/70"
          >
            <ChevronRight className="h-6 w-6" aria-hidden />
          </button>
        </>
      )}
      <p className="pb-safe px-4 py-2 text-center text-xs text-white/70">Double-tap or scroll to zoom · swipe for more</p>
    </div>,
    document.body,
  );
}
