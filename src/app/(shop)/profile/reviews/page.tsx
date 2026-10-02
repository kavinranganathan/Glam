import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReviewList, type ReviewItem } from "@/components/account/review-list";
import { getUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

export const metadata: Metadata = { title: "My Reviews" };

type Row = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  created_at: string;
  status: "pending" | "approved" | "rejected";
  product: { slug: string; name: string; images: string[] } | null;
};

/** User's reviews with edit/delete inside the 7-day window (PRD §8.10). */
export default async function MyReviewsPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/profile/reviews");
  const { data } = await serviceClient()
    .from("reviews")
    .select("id, rating, title, body, photos, created_at, status, product:products(slug, name, images)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const items: ReviewItem[] = ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    photos: r.photos ?? [],
    created_at: r.created_at,
    status: r.status,
    product: r.product ? { slug: r.product.slug, name: r.product.name, image: r.product.images?.[0] ?? null } : null,
  }));
  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-text">My reviews</h1>
      <p className="mt-1 mb-6 text-sm text-text-secondary">You can edit or delete a review for 7 days after posting it.</p>
      <ReviewList initial={items} />
    </div>
  );
}
