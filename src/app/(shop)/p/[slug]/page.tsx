import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, RotateCcw } from "lucide-react";
import { Badge, VerifiedBadge } from "@/components/ui/badge";
import { RatingSummary } from "@/components/ui/rating-stars";
import { Shelf } from "@/components/product/shelf";
import { WishlistButton } from "@/components/product/wishlist-button";
import { Gallery } from "@/components/product/gallery";
import { VariantSelector } from "@/components/product/variant-selector";
import { AddToBagBar } from "@/components/product/add-to-bag-bar";
import { ShareButton } from "@/components/product/share-button";
import { DetailsAccordion } from "@/components/product/details-accordion";
import { FrequentlyBoughtTogether } from "@/components/product/fbt";
import { PdpProvider } from "@/components/pdp/pdp-context";
import { pickInitialVariant } from "@/components/pdp/variant-logic";
import { PricingBlock } from "@/components/pdp/pricing-block";
import { PdpPincode } from "@/components/pdp/pdp-pincode";
import { ReviewsSection } from "@/components/pdp/reviews-section";
import { QASection } from "@/components/pdp/qa-section";
import { ProductJsonLd } from "@/components/pdp/product-json-ld";
import { TrackOnMount } from "@/components/analytics/screen-view";
import { getUser } from "@/lib/auth/session";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getProductBySlug } from "@/lib/catalogue/queries";
import { recordView } from "@/lib/catalogue/recently-viewed";
import { relatedProducts } from "@/lib/recommendations/shelves";
import { listQuestions } from "@/lib/reviews/qa";
import { env } from "@/lib/env";

type Params = Promise<{ slug: string }>;
type Search = Promise<Record<string, string | string[] | undefined>>;

const str = (v: string | string[] | undefined): string | null => (typeof v === "string" && v ? v : null);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug).catch(() => null);
  if (!product) return { title: "Product not found" };
  const title = `${product.name} — ${product.brand.name}`;
  const description = product.description.replace(/\s+/g, " ").slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/p/${product.slug}` },
    openGraph: { title, description, type: "website", images: product.images.slice(0, 1).map((url) => ({ url, alt: `${product.brand.name} ${product.name}` })) },
    twitter: { card: "summary_large_image", title, description, images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [user, sessionId] = await Promise.all([getUser().catch(() => null), getGuestSessionId()]);
  void recordView(product.id, user ? { id: user.id } : null, sessionId).catch((e) => console.error("[pdp] recordView failed", e));

  const [related, questions] = await Promise.all([
    relatedProducts(product),
    listQuestions(product.id).catch((e) => {
      console.error("[pdp] questions failed", e);
      return [];
    }),
  ]);

  const requestedVariant = str(sp.v);
  const initialVariant = pickInitialVariant(product.variants, requestedVariant);
  const src = str(sp.src);
  const pageUrl = `${env.siteUrl}/p/${product.slug}`;
  const crumbs = [...product.categoryPath].reverse();

  return (
    <PdpProvider product={product} initialVariantId={initialVariant.id} isPro={Boolean(user?.isPro)} isLoggedIn={Boolean(user)}>
      <ProductJsonLd product={product} url={pageUrl} />
      <TrackOnMount
        event="product_detail_viewed"
        props={{ product_id: product.id, sku: initialVariant.sku, price: initialVariant.price, brand: product.brand.slug, category: product.category.slug, source: src }}
      />
      <div className="mx-auto max-w-6xl pb-28 md:pb-24">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 overflow-x-auto px-4 py-3 text-xs text-text-tertiary scrollbar-none">
          <Link href="/" className="shrink-0 hover:text-text">
            Home
          </Link>
          {crumbs.map((c) => (
            <span key={c.id} className="flex shrink-0 items-center gap-1">
              <ChevronRight className="h-3 w-3" aria-hidden />
              <Link href={`/c/${c.slug}`} className="hover:text-text">
                {c.name}
              </Link>
            </span>
          ))}
        </nav>

        <div className="grid gap-6 px-4 lg:grid-cols-2 lg:gap-10">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Gallery images={product.images.length ? product.images : [product.image]} videoUrl={product.videoUrl} alt={`${product.brand.name} ${product.name}`} />
          </div>

          <div className="flex flex-col gap-5">
            <header className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/b/${product.brand.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                    {product.brand.name}
                    {product.brandVerified && <VerifiedBadge className="min-h-0" />}
                  </Link>
                  <h1 className="mt-1 font-display text-xl font-bold leading-snug text-text md:text-2xl">{product.name}</h1>
                </div>
                <div className="flex shrink-0 gap-2">
                  <WishlistButton productId={product.id} variantId={initialVariant.id} className="bg-surface shadow-none" />
                  <ShareButton title={`${product.name} — ${product.brand.name}`} text={`Check out ${product.name} on GLAM`} path={`/p/${product.slug}`} className="bg-surface shadow-none" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {product.ratingCount > 0 ? (
                  <a href="#reviews" className="rounded hover:bg-surface">
                    <RatingSummary avg={product.ratingAvg} count={product.ratingCount} className="text-sm" />
                  </a>
                ) : (
                  <a href="#reviews" className="text-xs text-text-tertiary hover:text-text">
                    No reviews yet
                  </a>
                )}
                {product.badges.includes("best_seller") && <Badge tone="warning">Best Seller</Badge>}
                {product.badges.includes("new") && <Badge tone="info">New Launch</Badge>}
                {product.soldCount >= 100 && <span className="text-xs text-text-tertiary">{product.soldCount.toLocaleString("en-IN")}+ sold</span>}
              </div>
            </header>

            <PricingBlock />
            <VariantSelector />
            <PdpPincode />

            <p className="flex items-start gap-2 text-xs text-text-tertiary">
              <RotateCcw className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {product.nonReturnable ? (
                <span>This item is non-returnable for hygiene reasons.</span>
              ) : (
                <span>
                  Easy {product.category.returnWindowDays}-day returns · Free pickup · Refund to original payment method or GLAM wallet.
                </span>
              )}
            </p>

            <DetailsAccordion product={product} />
          </div>
        </div>

        <ReviewsSection product={product} viewerId={user?.id ?? null} openReviewFor={str(sp.review)} />
        <QASection productId={product.id} initial={questions} isLoggedIn={Boolean(user)} />

        <FrequentlyBoughtTogether items={related.fbt} />
        <Shelf title="You May Also Like" subtitle={`More in ${product.category.name}`} items={related.alsoLike} shelfKey="pdp_also_like" href={`/c/${product.category.slug}`} />
        <Shelf title="Customers Also Viewed" items={related.alsoViewed} shelfKey="pdp_also_viewed" />
      </div>
      <AddToBagBar />
    </PdpProvider>
  );
}
