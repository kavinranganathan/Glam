"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Textarea } from "@/components/ui/input";
import { RatingStars } from "@/components/ui/rating-stars";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/track";
import { CONCERNS, SKIN_TYPES } from "@/lib/account/beauty-profile";
import { REVIEW_MAX_PHOTOS, REVIEW_MIN_BODY, reviewPoints } from "@/lib/reviews/eligibility";

interface BeautyProfileResponse {
  profile: { skin_type: string | null; concerns: string[] } | null;
}

/** Review composer sheet (PRD §8.5.8). Posts to /api/products/[id]/reviews. */
export function ReviewForm({
  productId,
  productName,
  orderItemId,
  open,
  onClose,
  onPosted,
}: {
  productId: string;
  productName: string;
  orderItemId: string;
  open: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const { toast } = useToast();
  const [rating, setRating] = React.useState(0);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [skinType, setSkinType] = React.useState<string | null>(null);
  const [concerns, setConcerns] = React.useState<string[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/me/beauty-profile")
      .then((r) => (r.ok ? (r.json() as Promise<BeautyProfileResponse>) : null))
      .then((data) => {
        if (cancelled || !data?.profile) return;
        setSkinType((s) => s ?? data.profile?.skin_type ?? null);
        setConcerns((c) => (c.length ? c : (data.profile?.concerns ?? [])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = REVIEW_MAX_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, room);
    if (!picked.length) {
      toast({ title: `You can add up to ${REVIEW_MAX_PHOTOS} photos`, tone: "warning" });
      return;
    }
    setUploading(true);
    for (const file of picked) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          toast({ title: data?.error?.message ?? `Couldn't upload ${file.name}`, tone: "error" });
          continue;
        }
        const { url } = (await res.json()) as { url: string };
        setPhotos((p) => [...p, url]);
      } catch {
        toast({ title: `Couldn't upload ${file.name}`, tone: "error" });
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const remaining = Math.max(0, REVIEW_MIN_BODY - body.trim().length);
  const canSubmit = rating > 0 && remaining === 0 && !submitting && !uploading;

  const submit = async () => {
    if (!canSubmit) {
      setError(rating === 0 ? "Please choose a star rating." : `Please write at least ${REVIEW_MIN_BODY} characters.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderItemId, rating, title: title.trim() || null, body: body.trim(), photos, skinType, concerns }),
      });
      const data = (await res.json().catch(() => null)) as { error?: { message?: string }; points?: number } | null;
      if (!res.ok) {
        setError(data?.error?.message ?? "Couldn't post your review.");
        return;
      }
      const pts = data?.points ?? reviewPoints(photos.length > 0);
      track("review_submitted", { product_id: productId, rating, has_photo: photos.length > 0, points: pts });
      toast({ title: `Review posted · +${pts} points`, description: "Thanks for helping other shoppers!", tone: "success" });
      onPosted();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Write a review"
      desktop="modal"
      size="lg"
      footer={
        <Button fullWidth size="lg" onClick={submit} loading={submitting} disabled={!canSubmit && !error}>
          Post review
        </Button>
      }
    >
      <p className="mb-4 text-sm text-text-secondary">
        Reviewing <span className="font-semibold text-text">{productName}</span> · Verified purchase
      </p>
      <div className="space-y-5">
        <div>
          <p className="mb-1 text-sm font-medium text-text-secondary">
            Your rating <span className="text-error">*</span>
          </p>
          <RatingStars value={rating} size={32} interactive onChange={setRating} />
        </div>
        <Input label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Sum it up in a line" />
        <Textarea
          label="Your review"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          placeholder="What did you like? How did it work for your skin or hair?"
          hint={remaining > 0 ? `${remaining} more characters needed` : `${body.trim().length} characters`}
        />
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">
            Photos (up to {REVIEW_MAX_PHOTOS}) <span className="text-text-tertiary">· +50 points with a photo, +20 without</span>
          </p>
          <ul className="flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <li key={src} className="relative h-20 w-20 overflow-hidden rounded-card bg-surface">
                <Image src={src} alt={`Upload ${i + 1}`} fill sizes="80px" className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((x) => x !== src))}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white min-h-0"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
            {photos.length < REVIEW_MAX_PHOTOS && (
              <li>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-card border border-dashed border-border text-xs text-text-tertiary hover:border-primary hover:text-primary"
                >
                  <ImagePlus className="h-5 w-5" aria-hidden /> {uploading ? "Uploading…" : "Add"}
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void onFiles(e.target.files)} aria-label="Choose photos" />
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">Skin type</p>
          <div className="flex flex-wrap gap-2">
            {SKIN_TYPES.map((s) => (
              <Chip key={s.value} size="sm" selected={skinType === s.value} onClick={() => setSkinType(skinType === s.value ? null : s.value)}>
                {s.label}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-text-secondary">Concerns</p>
          <div className="flex flex-wrap gap-2">
            {CONCERNS.map((c) => (
              <Chip key={c} size="sm" selected={concerns.includes(c)} onClick={() => setConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))}>
                {c}
              </Chip>
            ))}
          </div>
        </div>
        {error && (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
