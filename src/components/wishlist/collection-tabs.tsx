"use client";

import * as React from "react";
import { FolderPlus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import type { WishlistCollectionView } from "@/lib/wishlist/types";

export function CollectionTabs({
  collections,
  activeId,
  onChange,
  onCreate,
  onRename,
  onDelete,
}: {
  collections: WishlistCollectionView[];
  activeId: string;
  onChange: (id: string) => void;
  onCreate: (name: string) => Promise<boolean>;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [mode, setMode] = React.useState<"create" | "rename" | "delete" | null>(
    null,
  );
  const active = collections.find((c) => c.id === activeId);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Tabs
          tabs={collections.map((c) => ({
            value: c.id,
            label: c.name,
            count: c.itemCount,
          }))}
          value={activeId}
          onChange={onChange}
          className="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => setMode("create")}
          className="inline-flex h-11 shrink-0 items-center gap-1 rounded-pill px-3 text-sm font-semibold text-primary hover:bg-primary-soft"
        >
          <FolderPlus className="h-4 w-4" aria-hidden />{" "}
          <span className="hidden sm:inline">New collection</span>
          <span className="sr-only sm:hidden">New collection</span>
        </button>
      </div>
      {active && !active.isDefault && (
        <div className="flex gap-1 self-end">
          <button
            type="button"
            onClick={() => setMode("rename")}
            className="inline-flex h-11 items-center gap-1 rounded-pill px-3 text-sm font-medium text-text-secondary hover:bg-surface"
          >
            <Pencil className="h-4 w-4" aria-hidden /> Rename
          </button>
          <button
            type="button"
            onClick={() => setMode("delete")}
            className="inline-flex h-11 items-center gap-1 rounded-pill px-3 text-sm font-medium text-error hover:bg-error-soft"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Delete
          </button>
        </div>
      )}
      {mode === "create" && (
        <NameDialog
          open
          title="New collection"
          submitLabel="Create"
          onClose={() => setMode(null)}
          onSubmit={async (name) => {
            const ok = await onCreate(name);
            if (ok) setMode(null);
            return ok;
          }}
        />
      )}
      {mode === "rename" && (
        <NameDialog
          open
          title="Rename collection"
          submitLabel="Save"
          initial={active?.name ?? ""}
          onClose={() => setMode(null)}
          onSubmit={async (name) => {
            const ok = active ? await onRename(active.id, name) : false;
            if (ok) setMode(null);
            return ok;
          }}
        />
      )}
      <Dialog
        open={mode === "delete"}
        onClose={() => setMode(null)}
        title={`Delete "${active?.name ?? "collection"}"?`}
        description={
          active
            ? `${active.itemCount} saved ${active.itemCount === 1 ? "item" : "items"} will be removed from your wishlist.`
            : undefined
        }
        actions={
          <>
            <Button variant="ghost" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (active && (await onDelete(active.id))) setMode(null);
              }}
            >
              Delete
            </Button>
          </>
        }
      />
    </div>
  );
}

export function NameDialog({
  open,
  title,
  submitLabel,
  initial = "",
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  initial?: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<boolean>;
}) {
  const [name, setName] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    const clean = name.trim();
    if (!clean) {
      setError("Give the collection a name");
      return;
    }
    setBusy(true);
    const ok = await onSubmit(clean);
    setBusy(false);
    if (!ok) setError("Couldn't save. Please try again.");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Input
          label="Collection name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoFocus
          placeholder="e.g. Wedding glam"
          error={error ?? undefined}
        />
      </form>
    </Dialog>
  );
}
