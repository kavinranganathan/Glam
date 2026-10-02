"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Camera, Check, ChevronLeft, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { track } from "@/lib/analytics/track";
import type { OrderDetail, RefundMethod, ReturnableItemState } from "@/lib/orders/views";
import { photoRequired, refundEta, RETURN_REASONS } from "@/lib/returns/policy";
import { INELIGIBLE_LABEL, MAX_RETURN_PHOTOS, refundPreview, validateReturnPayload } from "@/lib/returns/rules";
import { cn } from "@/lib/utils/cn";
import { formatShortDate } from "@/lib/utils/dates";
import { formatINR } from "@/lib/utils/money";
import { AddressBlock } from "./address-block";

const STEPS = ["Items", "Reason", "Photos", "Refund", "Review"] as const;
type Step = 0 | 1 | 2 | 3 | 4;

interface Photo {
  url: string;
  preview: string;
}

/** S33 return flow: items → reason → photos → refund method → review & confirm. */
export function ReturnForm({ order, eligibility }: { order: OrderDetail; eligibility: ReturnableItemState[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = React.useState<Step>(0);
  const [qtyById, setQtyById] = React.useState<Record<string, number>>({});
  const [reason, setReason] = React.useState<string>("");
  const [comment, setComment] = React.useState("");
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const [refundMethod, setRefundMethod] = React.useState<RefundMethod>("original");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const stateById = React.useMemo(() => new Map(eligibility.map((e) => [e.orderItemId, e])), [eligibility]);
  const lines = Object.entries(qtyById)
    .filter(([, qty]) => qty > 0)
    .map(([order_item_id, qty]) => ({ order_item_id, qty }));
  const needsPhoto = photoRequired(reason);
  const refund = refundPreview(lines, order.items);

  const toggle = (id: string, remaining: number) =>
    setQtyById((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = Math.min(1, remaining);
      return next;
    });

  const canContinue = (): string | null => {
    switch (step) {
      case 0:
        return lines.length ? null : "Select at least one item to return.";
      case 1:
        return reason ? null : "Please choose a reason.";
      case 2:
        return needsPhoto && photos.length === 0 ? `Please add at least one photo for "${reason}" returns.` : null;
      default:
        return null;
    }
  };

  const next = () => {
    const problem = canContinue();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(4, s + 1) as Step);
  };
  const back = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1) as Step);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploadError(null);
    const room = MAX_RETURN_PHOTOS - photos.length;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (!picked.length) {
      setUploadError(`You can add up to ${MAX_RETURN_PHOTOS} photos.`);
      return;
    }
    setUploading(true);
    try {
      for (const file of picked) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        if (!res.ok) {
          const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
          throw new Error(res.status === 404 ? "Photo uploads are not available right now. Please try again later." : json.error?.message ?? "Could not upload this photo.");
        }
        const { url } = (await res.json()) as { url: string };
        setPhotos((prev) => [...prev, { url, preview: URL.createObjectURL(file) }].slice(0, MAX_RETURN_PHOTOS));
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Could not upload this photo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async () => {
    const payload = { items: lines, reason, comment: comment || null, refund_method: refundMethod, photos: photos.map((p) => p.url) };
    const check = validateReturnPayload(payload, {
      status: order.status,
      deliveredAt: order.deliveredAt,
      items: order.items.map((i) => ({ id: i.id, qty: i.qty, returnedQty: i.returnedQty, nonReturnable: i.nonReturnable, returnWindowDays: i.returnWindowDays })),
    });
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { returnId?: string; error?: { message?: string } };
      if (!res.ok || !json.returnId) throw new Error(json.error?.message ?? "Could not submit your return. Please try again.");
      track("return_initiated", {
        order_id: order.id,
        return_id: json.returnId,
        reason,
        refund_method: refundMethod,
        items: lines.length,
        refund_amount: refund,
      });
      toast({ title: "Return requested", description: "Free pickup will be scheduled within 24 hours.", tone: "success" });
      router.push(`/returns/${json.returnId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit your return.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-1 text-xs" aria-label="Return steps">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex flex-1 items-center gap-1">
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
                  done && "border-success bg-success text-white",
                  current && "border-primary bg-primary text-white",
                  !done && !current && "border-border text-text-tertiary",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </span>
              <span className={cn("hidden sm:inline", current ? "font-semibold text-text" : "text-text-tertiary")}>{label}</span>
              {i < STEPS.length - 1 && <span className={cn("mx-1 h-0.5 flex-1", done ? "bg-success" : "bg-border")} aria-hidden />}
            </li>
          );
        })}
      </ol>
      <p className="sm:hidden text-sm font-semibold text-text">
        Step {step + 1} of {STEPS.length}: {STEPS[step]}
      </p>

      {step === 0 && (
        <section aria-labelledby="ret-items">
          <h2 id="ret-items" className="font-display text-lg font-semibold">
            Which items are you returning?
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-card border border-border">
            {order.items.map((item) => {
              const st = stateById.get(item.id);
              const eligible = Boolean(st?.eligible);
              const selected = Boolean(qtyById[item.id]);
              const remaining = st?.remainingQty ?? 0;
              return (
                <li key={item.id} className={cn("flex gap-3 p-3", !eligible && "opacity-60")}>
                  <label className="flex flex-1 cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5 min-h-0 shrink-0 accent-primary"
                      checked={selected}
                      disabled={!eligible}
                      onChange={() => toggle(item.id, remaining)}
                      aria-describedby={`ret-item-${item.id}-state`}
                    />
                    <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-card bg-surface">
                      {item.image && <Image src={item.image} alt="" fill sizes="56px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-wide text-text-tertiary">{item.brandName}</span>
                      <span className="line-clamp-2 block text-sm font-medium text-text">{item.name}</span>
                      <span className="block text-xs text-text-tertiary">
                        {item.variantName && item.variantName !== "Default" ? `${item.variantName} · ` : ""}
                        {formatINR(item.unitPrice)} each
                      </span>
                      <span id={`ret-item-${item.id}-state`} className="block text-xs">
                        {eligible ? (
                          <span className="text-success">Return by {st?.deadline ? formatShortDate(st.deadline) : "—"}</span>
                        ) : (
                          <span className="text-text-tertiary">{st ? INELIGIBLE_LABEL[st.reason ?? "non_returnable"] : "Not eligible"}</span>
                        )}
                      </span>
                    </span>
                  </label>
                  {eligible && selected && remaining > 1 && (
                    <Select
                      aria-label={`Quantity to return for ${item.name}`}
                      value={qtyById[item.id]}
                      onChange={(e) => setQtyById((prev) => ({ ...prev, [item.id]: Number(e.target.value) }))}
                      className="w-20"
                    >
                      {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="ret-reason" className="flex flex-col gap-4">
          <h2 id="ret-reason" className="font-display text-lg font-semibold">
            Why are you returning?
          </h2>
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required>
            <option value="">Choose a reason</option>
            {RETURN_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
          <Textarea label="Tell us more (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="Anything that helps us fix this faster" />
          {needsPhoto && <p className="text-sm text-text-secondary">Photos are required for this reason — you can add them in the next step.</p>}
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="ret-photos" className="flex flex-col gap-3">
          <h2 id="ret-photos" className="font-display text-lg font-semibold">
            Add photos {needsPhoto ? "(required)" : "(optional)"}
          </h2>
          <p className="text-sm text-text-secondary">
            Up to {MAX_RETURN_PHOTOS} photos. {needsPhoto ? "Show the damage, the wrong item or the defect clearly." : "A quick photo helps our team process faster."}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((p, i) => (
              <div key={p.url} className="relative aspect-square overflow-hidden rounded-card border border-border bg-surface">
                <Image src={p.preview} alt={`Photo ${i + 1}`} fill sizes="33vw" className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((x) => x.url !== p.url))}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white min-h-0"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>
            ))}
            {photos.length < MAX_RETURN_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-border text-text-tertiary hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" aria-hidden /> : <ImagePlus className="h-6 w-6" aria-hidden />}
                <span className="text-xs font-medium">{uploading ? "Uploading…" : "Add photo"}</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => onFiles(e.target.files)} aria-label="Choose photos" />
          {uploadError && (
            <p role="alert" className="flex items-start gap-2 text-sm text-error">
              <Camera className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {uploadError}
            </p>
          )}
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="ret-refund" className="flex flex-col gap-3">
          <h2 id="ret-refund" className="font-display text-lg font-semibold">
            How should we refund {formatINR(refund)}?
          </h2>
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">Refund method</legend>
            {(
              [
                { value: "original", title: "Original payment method", eta: refundEta("original", order.paymentMethod) },
                { value: "wallet", title: "GLAM Wallet", eta: refundEta("wallet", order.paymentMethod) },
              ] as Array<{ value: RefundMethod; title: string; eta: string }>
            ).map((opt) => {
              const selected = refundMethod === opt.value;
              return (
                <label
                  key={opt.value}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors",
                    selected ? "border-primary bg-primary-soft" : "border-border hover:border-text-tertiary",
                  )}
                >
                  <input type="radio" name="refund-method" value={opt.value} checked={selected} onChange={() => setRefundMethod(opt.value)} className="mt-0.5 h-5 w-5 min-h-0 accent-primary" />
                  <span>
                    <span className="block text-sm font-semibold text-text">{opt.title}</span>
                    <span className="block text-xs text-text-secondary">{opt.eta}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        </section>
      )}

      {step === 4 && (
        <section aria-labelledby="ret-review" className="flex flex-col gap-4">
          <h2 id="ret-review" className="font-display text-lg font-semibold">
            Review and confirm
          </h2>
          <div className="rounded-card border border-border p-3">
            <h3 className="text-sm font-semibold text-text">Items</h3>
            <ul className="mt-1 text-sm text-text-secondary">
              {lines.map((l) => {
                const it = order.items.find((i) => i.id === l.order_item_id);
                return (
                  <li key={l.order_item_id} className="flex justify-between gap-2">
                    <span className="truncate">
                      {it?.name} × {l.qty}
                    </span>
                    <span>{formatINR((it?.unitPrice ?? 0) * l.qty)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 flex justify-between border-t border-border pt-2 text-sm font-semibold text-text">
              <span>Refund</span>
              <span>{formatINR(refund)}</span>
            </p>
            <p className="text-xs text-text-tertiary">{refundEta(refundMethod, order.paymentMethod)}</p>
          </div>
          <div className="rounded-card border border-border p-3 text-sm">
            <h3 className="font-semibold text-text">Reason</h3>
            <p className="text-text-secondary">
              {reason}
              {comment && ` — ${comment}`}
            </p>
            {photos.length > 0 && <p className="mt-1 text-xs text-text-tertiary">{photos.length} photo(s) attached</p>}
          </div>
          <div className="rounded-card border border-border p-3">
            <h3 className="text-sm font-semibold text-text">Pickup address</h3>
            <AddressBlock address={order.address} className="mt-1" />
            <p className="mt-2 text-xs text-text-tertiary">Free pickup within 24 hours. Keep the item in its original packaging if you can.</p>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-card border border-error/30 bg-error-soft px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="ghost" onClick={back} disabled={step === 0 || submitting}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Back
        </Button>
        {step < 4 ? (
          <Button onClick={next} disabled={uploading}>
            Continue
          </Button>
        ) : (
          <Button onClick={submit} loading={submitting}>
            Confirm return
          </Button>
        )}
      </div>
    </div>
  );
}
