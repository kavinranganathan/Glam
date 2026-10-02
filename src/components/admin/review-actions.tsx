"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { BRAND_RESPONSE_MAX } from "@/lib/admin/rules";
import type { AdminReviewRow } from "@/lib/admin/reviews";
import { useAdminApi } from "./use-admin-api";

/** Approve / reject and "Respond as brand" for one review. */
export function ReviewActions({ review }: { review: AdminReviewRow }) {
  const { call, busy } = useAdminApi();
  const [responding, setResponding] = React.useState(false);
  const [text, setText] = React.useState(review.brandResponse ?? "");
  const url = `/api/admin/reviews/${review.id}`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {review.status !== "approved" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => call("PATCH", url, { status: "approved" }, { success: "Review approved" })}>
            Approve
          </Button>
        )}
        {review.status !== "rejected" && (
          <Button size="sm" variant="outline" className="text-error" disabled={busy} onClick={() => call("PATCH", url, { status: "rejected" }, { success: "Review rejected" })}>
            Reject
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => setResponding((v) => !v)} aria-expanded={responding}>
          {review.brandResponse ? "Edit response" : "Respond as brand"}
        </Button>
      </div>
      {responding && (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await call("PATCH", url, { brandResponse: text.trim() || null }, { success: text.trim() ? "Response saved" : "Response removed" });
            if (res) setResponding(false);
          }}
        >
          <Textarea aria-label="Brand response" value={text} maxLength={BRAND_RESPONSE_MAX} onChange={(e) => setText(e.target.value)} placeholder="Thank the customer, address the concern…" className="[&_textarea]:min-h-20" hint={`${text.length}/${BRAND_RESPONSE_MAX}`} />
          <div className="flex gap-1">
            <Button type="submit" size="sm" loading={busy}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setResponding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
