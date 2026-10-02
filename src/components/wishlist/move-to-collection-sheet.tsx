"use client";

import * as React from "react";
import { Check, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { WishlistCollectionView, WishlistItemView } from "@/lib/wishlist/types";
import { cn } from "@/lib/utils/cn";

export function MoveToCollectionSheet({
  item,
  collections,
  onClose,
  onMove,
  onCreate,
}: {
  item: WishlistItemView | null;
  collections: WishlistCollectionView[];
  onClose: () => void;
  onMove: (item: WishlistItemView, collectionId: string) => Promise<boolean>;
  onCreate: (name: string) => Promise<WishlistCollectionView | null>;
}) {
  const [busy, setBusy] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");

  const move = async (collectionId: string) => {
    if (!item) return;
    setBusy(collectionId);
    const ok = await onMove(item, collectionId);
    setBusy(null);
    if (ok) onClose();
  };

  const createAndMove = async () => {
    const clean = name.trim();
    if (!clean || !item) return;
    setBusy("new");
    const created = await onCreate(clean);
    if (created) {
      const ok = await onMove(item, created.id);
      if (ok) {
        setName("");
        setCreating(false);
        onClose();
      }
    }
    setBusy(null);
  };

  return (
    <Sheet open={Boolean(item)} onClose={onClose} title="Move to collection" desktop="modal" size="sm">
      {item && (
        <p className="mb-3 text-sm text-text-secondary">
          Choose where to keep <span className="font-semibold text-text">{item.name}</span>.
        </p>
      )}
      <ul className="flex flex-col gap-2" aria-label="Collections">
        {collections.map((c) => {
          const current = item?.collectionId === c.id;
          return (
            <li key={c.id}>
              <button
                type="button"
                disabled={current || busy !== null}
                onClick={() => void move(c.id)}
                aria-current={current ? "true" : undefined}
                className={cn("flex w-full items-center justify-between rounded-card border px-4 py-3 text-left text-sm", current ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface")}
              >
                <span className="font-medium">
                  {c.name} <span className="text-xs text-text-tertiary">({c.itemCount})</span>
                </span>
                {current && <Check className="h-4 w-4" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
      {creating ? (
        <form
          className="mt-3 flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void createAndMove();
          }}
        >
          <Input label="New collection" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus className="flex-1" />
          <Button type="submit" className="mt-[26px]" loading={busy === "new"} disabled={!name.trim()}>
            Move
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => setCreating(true)} className="mt-3 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-primary">
          <FolderPlus className="h-4 w-4" aria-hidden /> New collection
        </button>
      )}
    </Sheet>
  );
}
