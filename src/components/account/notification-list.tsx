"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { useBadges } from "@/components/layout/badges-provider";
import { track } from "@/lib/analytics/track";
import { groupNotifications, notificationGroup, type NotificationGroup } from "@/lib/loyalty/rules";
import { timeAgo } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  read_at: string | null;
  created_at: string;
}

type Filter = "all" | NotificationGroup;
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "orders", label: "Orders" },
  { value: "offers", label: "Offers" },
  { value: "rewards", label: "Rewards" },
];

/** S07 notification centre: filter chips, Today/Earlier groups, tap → mark read → deep link. */
export function NotificationList({ initial }: { initial: NotificationItem[] }) {
  const router = useRouter();
  const { refresh } = useBadges();
  const [items, setItems] = React.useState(initial);
  const [filter, setFilter] = React.useState<Filter>("all");
  const [marking, setMarking] = React.useState(false);

  const visible = filter === "all" ? items : items.filter((n) => notificationGroup(n.type) === filter);
  const groups = groupNotifications(visible);
  const unread = items.filter((n) => !n.read_at).length;

  const open = async (n: NotificationItem) => {
    track("notification_clicked", { type: n.type, href: n.href ?? "" });
    if (!n.read_at) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      void fetch(`/api/notifications/${n.id}/read`, { method: "PATCH" }).then(() => refresh());
    }
    if (n.href) router.push(n.href);
  };

  const markAll = async () => {
    setMarking(true);
    const stamp = new Date().toISOString();
    setItems((prev) => prev.map((x) => (x.read_at ? x : { ...x, read_at: stamp })));
    await fetch("/api/me/notifications", { method: "PATCH" });
    await refresh();
    setMarking(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none" role="group" aria-label="Filter notifications">
          {FILTERS.map((f) => (
            <Chip key={f.value} size="sm" selected={filter === f.value} onClick={() => setFilter(f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={markAll} disabled={unread === 0} loading={marking} className="shrink-0">
          <CheckCheck className="h-4 w-4" aria-hidden /> Mark all read
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-7 w-7" aria-hidden />}
          title={items.length === 0 ? "You're all caught up" : "Nothing here yet"}
          description={items.length === 0 ? "Order updates, price drops and rewards will show up here for 90 days." : "No notifications in this category in the last 90 days."}
          action={{ label: "Explore products", href: "/explore" }}
          secondary={{ label: "Notification settings", href: "/profile/notifications" }}
        />
      ) : (
        <>
          <Group title="Today" items={groups.today} onOpen={open} />
          <Group title="Earlier" items={groups.earlier} onOpen={open} />
        </>
      )}
    </div>
  );
}

function Group({ title, items, onOpen }: { title: string; items: NotificationItem[]; onOpen: (n: NotificationItem) => void }) {
  if (!items.length) return null;
  return (
    <section aria-labelledby={`notif-${title}`}>
      <h2 id={`notif-${title}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
        {title}
      </h2>
      <ul className="divide-y divide-border rounded-card border border-border bg-background">
        {items.map((n) => {
          const unread = !n.read_at;
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onOpen(n)}
                className={cn("flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface focus-visible:bg-surface", unread && "bg-primary-soft/40")}
                aria-label={`${unread ? "Unread: " : ""}${n.title}`}
              >
                <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", unread ? "bg-primary" : "bg-transparent")} aria-hidden />
                <span className="flex-1 min-w-0">
                  <span className={cn("block text-sm text-text", unread ? "font-bold" : "font-medium")}>{n.title}</span>
                  <span className="block text-sm text-text-secondary line-clamp-2">{n.body}</span>
                </span>
                <span className="shrink-0 text-xs text-text-tertiary">{timeAgo(n.created_at)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
