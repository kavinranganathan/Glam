import "server-only";

import { unstable_cache } from "next/cache";
import { getActiveFlashSale, getCategoryTree } from "./queries";

export interface NavCategory {
  slug: string;
  name: string;
  children: Array<{ slug: string; name: string }>;
}

/** Slim category navigation shared by every page via the shop layout; cached for 5 minutes. */
export const getCachedCategoryNav = unstable_cache(
  async (): Promise<NavCategory[]> => {
    const tree = await getCategoryTree();
    return tree.map((c) => ({ slug: c.slug, name: c.name, children: c.children.map((s) => ({ slug: s.slug, name: s.name })) }));
  },
  ["category-nav"],
  { revalidate: 300, tags: ["categories"] },
);

/** Whether a flash sale is live right now; cached for 60 seconds. */
export const getCachedFlashSaleActive = unstable_cache(
  async (): Promise<boolean> => Boolean(await getActiveFlashSale()),
  ["flash-sale-active"],
  { revalidate: 60, tags: ["flash-sales"] },
);
