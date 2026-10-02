"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportedQa } from "@/lib/admin/reviews";
import { timeAgo } from "@/lib/utils/dates";
import { DataTable, type Column } from "./data-table";
import { useAdminApi } from "./use-admin-api";

/** Reported questions/answers with a delete action. */
export function QaModeration({ items }: { items: ReportedQa[] }) {
  const { call, busy } = useAdminApi();
  const columns: Column<ReportedQa>[] = [
    { key: "kind", header: "Type", render: (q) => <Badge tone={q.kind === "question" ? "info" : "secondary"}>{q.kind}</Badge> },
    {
      key: "body",
      header: "Content",
      render: (q) => (
        <div>
          <p className="line-clamp-3">{q.body}</p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {q.userName ?? "Anonymous"} · {timeAgo(q.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: "product",
      header: "Product",
      render: (q) =>
        q.productSlug ? (
          <Link href={`/p/${q.productSlug}`} className="text-primary hover:underline">
            {q.productName}
          </Link>
        ) : (
          q.productName
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      render: (q) => (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" className="text-error" disabled={busy} onClick={() => window.confirm("Delete this content?") && call("DELETE", `/api/admin/qa/${q.id}`, { kind: q.kind }, { success: "Deleted" })}>
            Delete
          </Button>
        </div>
      ),
    },
  ];
  return <DataTable columns={columns} rows={items} rowKey={(q) => `${q.kind}-${q.id}`} caption="Reported Q&A" empty="Nothing reported. Clean community." />;
}
