import { Suspense } from "react";
import type { Metadata } from "next";
import { BannerCarousel } from "@/components/home/banner-carousel";
import { BeautyProfileNudge } from "@/components/home/beauty-profile-nudge";
import { CategoryPills, CategoryPillsSkeleton } from "@/components/home/category-pills";
import { EditorialCards } from "@/components/home/editorial-cards";
import { FlashSaleStrip } from "@/components/home/flash-sale-strip";
import { ProUpsellCard } from "@/components/home/pro-upsell";
import { ProductCard } from "@/components/product/product-card";
import { Shelf } from "@/components/product/shelf";
import { ShelfSkeleton } from "@/components/ui/skeleton";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { getBanners, getCategoryTree, getEditorialCards, getFlashSaleView } from "@/lib/catalogue/queries";
import type { Shelf as ShelfData } from "@/lib/catalogue/types";
import { homeShelves } from "@/lib/recommendations/shelves";
import { serviceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: { absolute: "GLAM — Beauty & Lifestyle Marketplace" },
};

/** Shelf key -> "See all" destination (overrides the recommendation layer's defaults). */
const SHELF_HREF: Record<string, string> = {
  personalised: "/search?sort=relevance",
  trending: "/search?sort=popularity",
  new_launches: "/search?sort=newest",
  best_sellers: "/search?sort=popularity",
};

/** Home feed in PRD §8.2.2 order. Every block streams independently so one failure never blanks the page. */
export default async function HomePage() {
  const [user, sessionId] = await Promise.all([getUser().catch(() => null), getGuestSessionId()]);
  const viewer = user ? { id: user.id } : null;
  const shelves = homeShelves(viewer, sessionId).catch((e: unknown) => {
    console.error("[home] shelves failed", e);
    return [] as ShelfData[];
  });

  return (
    <div className="mx-auto flex max-w-7xl flex-col pb-8">
      <Suspense fallback={<div className="skeleton aspect-video w-full md:aspect-[21/9] lg:rounded-card" aria-hidden />}>
        <Banners />
      </Suspense>
      <Suspense fallback={<CategoryPillsSkeleton />}>
        <Categories />
      </Suspense>
      <Suspense fallback={null}>
        <ProfileNudge userId={user?.id ?? null} />
      </Suspense>
      {user && <HomeShelf shelves={shelves} shelfKey="personalised" />}
      <HomeShelf shelves={shelves} shelfKey="trending" />
      <HomeShelf shelves={shelves} shelfKey="new_launches" />
      {user && <HomeShelf shelves={shelves} shelfKey="brands_you_love" />}
      <Suspense fallback={<ShelfSkeleton count={3} />}>
        <BeautyEdit />
      </Suspense>
      <Suspense fallback={null}>
        <FlashSale />
      </Suspense>
      <HomeShelf shelves={shelves} shelfKey="continue_shopping" />
      <HomeShelf shelves={shelves} shelfKey="best_sellers" />
      {!user?.isPro && <ProUpsellCard />}
    </div>
  );
}

async function Banners() {
  const banners = await getBanners().catch((e: unknown) => {
    console.error("[home] banners failed", e);
    return [];
  });
  return <BannerCarousel banners={banners} />;
}

async function Categories() {
  const roots = await getCategoryTree().catch(() => []);
  return <CategoryPills categories={roots} />;
}

async function ProfileNudge({ userId }: { userId: string | null }) {
  if (!userId) return <BeautyProfileNudge />;
  try {
    const { data } = await serviceClient().from("beauty_profiles").select("user_id").eq("user_id", userId).maybeSingle();
    if (data) return null;
  } catch (e) {
    console.error("[home] beauty profile lookup failed", e);
    return null;
  }
  return <BeautyProfileNudge />;
}

function HomeShelf({ shelves, shelfKey }: { shelves: Promise<ShelfData[]>; shelfKey: string }) {
  return (
    <Suspense fallback={<ShelfSkeleton />}>
      <ResolvedShelf shelves={shelves} shelfKey={shelfKey} />
    </Suspense>
  );
}

async function ResolvedShelf({ shelves, shelfKey }: { shelves: Promise<ShelfData[]>; shelfKey: string }) {
  const all = await shelves;
  const shelf = all.find((s) => s.key === shelfKey || s.key === `${shelfKey}_fallback`);
  if (!shelf) return null;
  return <Shelf title={shelf.title} subtitle={shelf.subtitle} href={SHELF_HREF[shelfKey] ?? shelf.href} items={shelf.items} shelfKey={shelf.key} />;
}

async function BeautyEdit() {
  const cards = await getEditorialCards().catch((e: unknown) => {
    console.error("[home] editorial failed", e);
    return [];
  });
  return <EditorialCards cards={cards} />;
}

async function FlashSale() {
  const sale = await getFlashSaleView().catch((e: unknown) => {
    console.error("[home] flash sale failed", e);
    return null;
  });
  if (!sale || !sale.items.length) return null;
  return (
    <FlashSaleStrip name={sale.name} endsAt={sale.endsAt}>
      <div className="flex snap-x gap-3 overflow-x-auto pb-1 scrollbar-none">
        {sale.items.slice(0, 6).map((p, i) => (
          <div key={p.id} className="w-[46vw] shrink-0 snap-start sm:w-56 md:w-60">
            <ProductCard product={p} shelf="flash_sale" position={i} />
          </div>
        ))}
      </div>
    </FlashSaleStrip>
  );
}
