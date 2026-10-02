"use client";

import * as React from "react";
import { Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { useBadges } from "@/components/layout/badges-provider";
import { useWishlistState } from "@/components/product/wishlist-state";
import type { WishlistCollectionView, WishlistItemView } from "@/lib/wishlist/types";
import { CollectionTabs } from "./collection-tabs";
import { MoveToBag } from "./move-to-bag";
import { MoveToCollectionSheet } from "./move-to-collection-sheet";
import { WishlistCard } from "./wishlist-card";

interface WishlistData {
  collections: WishlistCollectionView[];
  items: WishlistItemView[];
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: { message?: string } };
    return data.error?.message ?? "Something went wrong";
  } catch {
    return "Something went wrong";
  }
}

export function WishlistPage({ initial, siteUrl }: { initial: WishlistData; siteUrl: string }) {
  const [data, setData] = React.useState<WishlistData>(initial);
  const [activeId, setActiveId] = React.useState(initial.collections[0]?.id ?? "");
  const [moving, setMoving] = React.useState<WishlistItemView | null>(null);
  const { toast } = useToast();
  const badges = useBadges();
  const hearts = useWishlistState();

  const active = data.collections.find((c) => c.id === activeId) ?? data.collections[0];
  const visible = active ? data.items.filter((i) => i.collectionId === active.id) : [];

  const reload = React.useCallback(async () => {
    const res = await fetch("/api/wishlist", { cache: "no-store" });
    if (res.ok) setData((await res.json()) as WishlistData);
    void badges.refresh();
  }, [badges]);

  const request = React.useCallback(
    async (input: string, init: RequestInit): Promise<Response | null> => {
      const res = await fetch(input, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } }).catch(() => null);
      if (!res || !res.ok) {
        toast({ title: res ? await readError(res) : "Network error. Please try again.", tone: "error" });
        return null;
      }
      return res;
    },
    [toast],
  );

  const createCollection = async (name: string): Promise<WishlistCollectionView | null> => {
    const res = await request("/api/wishlist/collections", { method: "POST", body: JSON.stringify({ name }) });
    if (!res) return null;
    const created = (await res.json()) as WishlistCollectionView;
    setData((d) => ({ ...d, collections: [...d.collections, created] }));
    return created;
  };

  const removeItem = async (item: WishlistItemView) => {
    setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id), collections: d.collections.map((c) => (c.id === item.collectionId ? { ...c, itemCount: Math.max(0, c.itemCount - 1) } : c)) }));
    const res = await request(`/api/wishlist/items/${item.id}`, { method: "DELETE" });
    if (!res) {
      void reload();
      return;
    }
    if (!data.items.some((i) => i.productId === item.productId && i.id !== item.id)) hearts.set(item.productId, false);
    void badges.refresh();
  };

  const share = async () => {
    if (!active) return;
    const url = `${siteUrl.replace(/\/$/, "")}/wishlist/s/${active.shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Anyone with the link can view this collection.", tone: "success" });
    } catch {
      toast({ title: "Copy this link", description: url, tone: "info", durationMs: 8000 });
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 md:py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-text">Wishlist</h1>
        {active && (
          <Button variant="outline" size="sm" onClick={() => void share()}>
            <Share2 className="h-4 w-4" aria-hidden /> Share
          </Button>
        )}
      </div>
      <div className="mt-3">
        <CollectionTabs
          collections={data.collections}
          activeId={active?.id ?? ""}
          onChange={setActiveId}
          onCreate={async (name) => {
            const created = await createCollection(name);
            if (created) setActiveId(created.id);
            return Boolean(created);
          }}
          onRename={async (id, name) => {
            const res = await request(`/api/wishlist/collections/${id}`, { method: "PATCH", body: JSON.stringify({ name }) });
            if (res) setData((d) => ({ ...d, collections: d.collections.map((c) => (c.id === id ? { ...c, name } : c)) }));
            return Boolean(res);
          }}
          onDelete={async (id) => {
            const res = await request(`/api/wishlist/collections/${id}`, { method: "DELETE" });
            if (res) {
              setActiveId(data.collections.find((c) => c.isDefault)?.id ?? data.collections[0]?.id ?? "");
              void reload();
            }
            return Boolean(res);
          }}
        />
      </div>
      {visible.length === 0 ? (
        <EmptyState
          icon={<Heart className="h-8 w-8" aria-hidden />}
          title={active?.isDefault ? "Your wishlist is empty" : `Nothing in "${active?.name ?? "this collection"}" yet`}
          description="Tap the heart on any product to save it here. We'll let you know when prices drop or items are back in stock."
          action={{ label: "Explore products", href: "/explore" }}
          secondary={{ label: "View bag", href: "/bag" }}
        />
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => (
            <WishlistCard
              key={item.id}
              item={item}
              onRemove={(it) => void removeItem(it)}
              onMove={setMoving}
              onMovedToBag={(it) => void removeItem(it)}
              canMove={data.collections.length > 1}
              moveToBag={(it, onMoved) => <MoveToBag item={it} onMoved={onMoved} />}
            />
          ))}
        </div>
      )}
      <MoveToCollectionSheet
        item={moving}
        collections={data.collections}
        onClose={() => setMoving(null)}
        onCreate={createCollection}
        onMove={async (item, collectionId) => {
          const res = await request(`/api/wishlist/items/${item.id}`, { method: "PATCH", body: JSON.stringify({ collectionId }) });
          if (res) {
            toast({ title: "Moved", tone: "success" });
            void reload();
          }
          return Boolean(res);
        }}
      />
    </div>
  );
}
