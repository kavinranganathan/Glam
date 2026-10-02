import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BrandTabs } from "@/components/brand/brand-tabs";
import { FollowButton } from "@/components/brand/follow-button";
import { VerifiedBadge } from "@/components/ui/badge";
import { getUser } from "@/lib/auth/session";
import { getBrand, listProducts } from "@/lib/catalogue/queries";
import { serviceClient } from "@/lib/supabase/service";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrand(slug).catch(() => null);
  if (!brand) return { title: "Brand not found" };
  return {
    title: `${brand.name} — Brand Store`,
    description: brand.tagline ?? `Shop ${brand.name} on GLAM: new arrivals, best sellers and the full range.`,
  };
}

async function isFollowing(userId: string | undefined, brandId: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const { data } = await serviceClient().from("brand_follows").select("brand_id").eq("user_id", userId).eq("brand_id", brandId).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

/** Brand storefront (PRD §8.14): cover, logo, verification, tagline, follow, tabbed catalogue. */
export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const brand = await getBrand(slug);
  if (!brand) notFound();

  const user = await getUser().catch(() => null);
  const [initial, following] = await Promise.all([
    listProducts({ brands: [brand.slug], sort: "newest" }),
    isFollowing(user?.id, brand.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl pb-8">
      <div className="relative aspect-[3/1] w-full overflow-hidden bg-gradient-to-r from-primary-soft to-secondary-soft md:aspect-[4/1] lg:rounded-b-card">
        {brand.coverUrl && <Image src={brand.coverUrl} alt="" fill priority sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" />}
      </div>

      <header className="relative px-4">
        <div className="-mt-10 flex items-end gap-4 md:-mt-12">
          <span className="relative block h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-background bg-surface shadow-card md:h-24 md:w-24">
            {brand.logoUrl ? (
              <Image src={brand.logoUrl} alt={`${brand.name} logo`} fill sizes="96px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-primary" aria-hidden>
                {brand.name.charAt(0)}
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-xl font-bold text-text md:text-2xl">
              {brand.name}
              {brand.verified && <VerifiedBadge />}
            </h1>
            {brand.tagline && <p className="truncate text-sm text-text-secondary">{brand.tagline}</p>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <FollowButton brandId={brand.id} brandSlug={brand.slug} initialFollowing={following} initialCount={brand.followerCount} isLoggedIn={Boolean(user)} />
          <p className="text-sm text-text-tertiary">{initial.total.toLocaleString("en-IN")} products</p>
        </div>
      </header>

      <div className="mt-4 px-4">
        <BrandTabs
          brand={{ slug: brand.slug, name: brand.name, about: brand.about, certifications: brand.certifications, socials: brand.socials }}
          initial={initial}
        />
      </div>
    </div>
  );
}
