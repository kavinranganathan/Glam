"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Textarea } from "@/components/ui/input";
import { RatingStars } from "@/components/ui/rating-stars";
import { Dialog, Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { canEditReview } from "@/lib/loyalty/rules";
import { formatShortDate } from "@/lib/utils/dates";

export interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  created_at: string;
  status: "pending" | "approved" | "rejected";
  product: { slug: string; name: string; image: string | null } | null;
}

/** /profile/reviews list with Edit/Delete inside the 7-day window (PATCH/DELETE /api/me/reviews/[id]). */
export function ReviewList({ initial }: { initial: ReviewItem[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = React.useState(initial);
  const [editing, setEditing] = React.useState<ReviewItem | null>(null);
  const [draft, setDraft] = React.useState({ rating: 5, title: "", body: "" });
  const [deleting, setDeleting] = React.useState<ReviewItem | null>(null);
  const [busy, setBusy] = React.useState(false);

  const startEdit = (r: ReviewItem) => {
    setEditing(r);
    setDraft({ rating: r.rating, title: r.title ?? "", body: r.body });
  };

  const save = async () => {
    if (!editing) return;
    if (draft.body.trim().length < 30) return toast({ title: "Please write at least 30 characters.", tone: "warning" });
    setBusy(true);
    try {
      const res = await fetch(`/api/me/reviews/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: draft.rating, title: draft.title.trim() || null, body: draft.body.trim() }),
      });
      const json = (await res.json()) as { error?: { message: string } };
      if (!res.ok) throw new Error(json.error?.message ?? "Could not save");
      setItems((prev) => prev.map((x) => (x.id === editing.id ? { ...x, rating: draft.rating, title: draft.title.trim() || null, body: draft.body.trim() } : x)));
      setEditing(null);
      toast({ title: "Review updated", tone: "success" });
      router.refresh();
    } catch (e) {
      toast({ title: e instanceof Error ? e.message : "Could not save", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await fetch(`/api/me/reviews/${deleting.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) return toast({ title: "Could not delete review", tone: "error" });
    setItems((prev) => prev.filter((x) => x.id !== deleting.id));
    setDeleting(null);
    toast({ title: "Review deleted", tone: "success" });
  };

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-7 w-7" aria-hidden />}
        title="No reviews yet"
        description="Review products from delivered orders to earn 50 points with a photo or 20 without."
        action={{ label: "View my orders", href: "/orders" }}
      />
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {items.map((r) => {
          const editable = canEditReview(r.created_at);
          return (
            <li key={r.id} className="rounded-card border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                {r.product?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.product.image} alt="" className="h-14 w-14 shrink-0 rounded-card object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  {r.product ? (
                    <Link href={`/p/${r.product.slug}`} className="block truncate text-sm font-semibold text-text hover:text-primary">
                      {r.product.name}
                    </Link>
                  ) : (
                    <span className="block text-sm font-semibold text-text-tertiary">Product no longer available</span>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
                    <RatingStars value={r.rating} />
                    <span>{formatShortDate(r.created_at)}</span>
                    {r.status !== "approved" && <span className="rounded-pill bg-warning-soft px-2 py-0.5 text-warning">{r.status}</span>}
                  </div>
                </div>
              </div>
              {r.title && <p className="mt-3 font-semibold text-text">{r.title}</p>}
              <p className="mt-1 whitespace-pre-line text-sm text-text-secondary">{r.body}</p>
              {r.photos.length > 0 && (
                <ul className="mt-3 flex gap-2 overflow-x-auto">
                  {r.photos.map((src, i) => (
                    <li key={src}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt={`Review photo ${i + 1}`} className="h-16 w-16 rounded-card object-cover" />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex items-center gap-2">
                {editable ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)}>
                      <Pencil className="h-4 w-4" aria-hidden /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(r)} className="text-error">
                      <Trash2 className="h-4 w-4" aria-hidden /> Delete
                    </Button>
                  </>
                ) : (
                  <span className="text-xs text-text-tertiary">Edit window (7 days) has closed</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit review" desktop="modal" footer={<Button onClick={save} loading={busy} fullWidth>Save review</Button>}>
        <div className="flex flex-col gap-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-text-secondary">Rating</span>
            <div className="flex gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" role="radio" aria-checked={draft.rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setDraft((d) => ({ ...d, rating: n }))} className="rounded p-1">
                  <Star className={n <= draft.rating ? "h-7 w-7 fill-warning text-warning" : "h-7 w-7 text-border"} aria-hidden />
                </button>
              ))}
            </div>
          </div>
          <Input label="Title (optional)" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} maxLength={120} />
          <Textarea label="Review" value={draft.body} onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))} maxLength={2000} hint={`${draft.body.trim().length}/30 characters minimum`} />
        </div>
      </Sheet>

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete this review?"
        description="Points already earned for it are kept, but the review is removed from the product page."
        actions={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Keep
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={busy}>
              Delete
            </Button>
          </>
        }
      />
    </>
  );
}
