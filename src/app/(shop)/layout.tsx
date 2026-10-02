import { Suspense } from "react";
import { AppBar } from "@/components/layout/app-bar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { DesktopNav } from "@/components/layout/desktop-nav";
import { Footer } from "@/components/layout/footer";
import { BadgesProvider } from "@/components/layout/badges-provider";
import { OnboardingCarousel } from "@/components/layout/onboarding-carousel";
import { ToastProvider } from "@/components/ui/toast";
import { ScreenViewTracker } from "@/components/analytics/screen-view";
import { getUser } from "@/lib/auth/session";
import { getCachedCategoryNav, getCachedFlashSaleActive } from "@/lib/catalogue/cached";
import { getWishlistProductIds } from "@/lib/wishlist/service";
import { WishlistStateProvider } from "@/components/product/wishlist-state";

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser().catch(() => null);
  const [categories, flash, wishlistIds] = await Promise.all([
    getCachedCategoryNav().catch(() => []),
    getCachedFlashSaleActive().catch(() => false),
    user
      ? getWishlistProductIds(user.id)
          .then((s) => [...s])
          .catch(() => [] as string[])
      : Promise.resolve([] as string[]),
  ]);
  return (
    <ToastProvider>
      <BadgesProvider initial={{ isLoggedIn: Boolean(user) }}>
        <WishlistStateProvider initialIds={wishlistIds}>
          <Suspense
            fallback={<div className="h-14 md:h-16 border-b border-border" />}
          >
            <AppBar userName={user?.name ?? null} />
          </Suspense>
          <DesktopNav categories={categories} flashSaleActive={flash} />
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <Footer />
          <BottomNav />
          <OnboardingCarousel isLoggedIn={Boolean(user)} />
          <Suspense>
            <ScreenViewTracker />
          </Suspense>
        </WishlistStateProvider>
      </BadgesProvider>
    </ToastProvider>
  );
}
