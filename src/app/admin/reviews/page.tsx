import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { RatingStars } from "@/components/ui/rating-stars";
import { DataTable, PageHeader, type Column } from "@/components/admin/data-table";
import { QaModeration } from "@/components/admin/qa-moderation";
import { ReviewActions } from "@/components/admin/review-actions";
import { requireAdminPage } from "@/lib/admin/guard";
import { listRecentReviews, listReportedQa, type AdminReviewRow, type ReviewStatus } from "@/lib/admin/service";
import { formatDateTime } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

const STATUSES: ReviewStatus[] = ["approved", "pending", "rejected"];
const TONE: Record<ReviewStatus, "success" | "warning" | "error"> = { approved: "success", pending: "warning", rejected: "error" };

const columns: Column<AdminReviewRow>[] = [
  {
    key: "product",
    header: "Product",
    render: (r) => (
      <div className="min-w-0 max-w-48">
        <Link href={`/p/${r.product.slug}`} className="line-clamp-2 font-medium hover:underline">
          {r.product.name}
        </Link>
        <p className="text-xs text-text-tertiary">{formatDateTime(r.createdAt)}</p>
      </div>
    ),
  },
  {
    key: "rating",
    header: "Rating",
    render: (r) => (
      <div>
        <RatingStars value={r.rating} size={14} />
        <p className="text-xs text-text-tertiary">{r.user?.name ?? r.user?.email ?? "—"}</p>
      </div>
    ),
  },
  {
    key: "body",
    header: "Review",
    render: (r) => (
      <div className="max-w-md">
        {r.title && <p className="font-semibold">{r.title}</p>}
        <p className="line-clamp-4 text-text-secondary">{r.body}</p>
        {r.photos.length > 0 && <p className="text-xs text-text-tertiary">{r.photos.length} photo(s)</p>}
        {r.brandResponse && (
          <p className="mt-1 rounded bg-surface px-2 py-1 text-xs text-text-secondary">
            <span className="font-semibold">Brand:</span> {r.brandResponse}
          </p>
        )}
      </div>
    ),
  },
  { key: "status", header: "Status", render: (r) => <Badge tone={TONE[r.status]}>{r.status}</Badge> },
  { key: "actions", header: "Actions", render: (r) => <ReviewActions review={r} /> },
];

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage("/admin/reviews");
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as ReviewStatus) ? (sp.status as ReviewStatus) : undefined;
  const [reviews, qa] = await Promise.all([listRecentReviews(status), listReportedQa()]);
  return (
    <>
      <PageHeader title="Reviews & Q&A" description="Approve or reject reviews (ratings recompute), respond as the brand, and remove reported questions or answers." />
      <nav aria-label="Filter reviews" className="mb-3 flex flex-wrap gap-1">
        <Link href="/admin/reviews" className={`rounded-pill border px-3 py-2 text-sm ${!status ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={!status ? "page" : undefined}>
          Latest
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} className={`rounded-pill border px-3 py-2 text-sm capitalize ${status === s ? "border-primary bg-primary-soft text-primary" : "border-border"}`} aria-current={status === s ? "page" : undefined}>
            {s}
          </Link>
        ))}
      </nav>
      <DataTable columns={columns} rows={reviews} rowKey={(r) => r.id} caption="Reviews" empty="No reviews yet." />
      <h2 className="mb-2 mt-8 font-display text-lg font-semibold">Reported Q&A ({qa.length})</h2>
      <QaModeration items={qa} />
    </>
  );
}
