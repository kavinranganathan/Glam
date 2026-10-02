"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface FollowResponse {
  following: boolean;
  followerCount: number;
}

export function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("en-IN");
}

/** Optimistic follow / unfollow with rollback. Guests are sent to login with `next`. */
export function FollowButton({
  brandId,
  brandSlug,
  initialFollowing,
  initialCount,
  isLoggedIn,
}: {
  brandId: string;
  brandSlug: string;
  initialFollowing: boolean;
  initialCount: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [following, setFollowing] = React.useState(initialFollowing);
  const [count, setCount] = React.useState(initialCount);
  const [busy, setBusy] = React.useState(false);

  const toggle = async () => {
    if (!isLoggedIn) {
      router.push(`/login?next=${encodeURIComponent(`/b/${brandSlug}`)}`);
      return;
    }
    if (busy) return;
    const prev = { following, count };
    setBusy(true);
    setFollowing(!following);
    setCount((c) => Math.max(0, c + (following ? -1 : 1)));
    try {
      const res = await fetch(`/api/brands/${brandId}/follow`, { method: following ? "DELETE" : "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FollowResponse;
      setFollowing(data.following);
      setCount(data.followerCount);
      toast({ title: data.following ? "Following brand" : "Unfollowed", tone: "success", durationMs: 2000 });
    } catch {
      setFollowing(prev.following);
      setCount(prev.count);
      toast({ title: "Couldn’t update follow", description: "Please try again.", tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-text-secondary">
        <span className="font-semibold text-text">{formatFollowers(count)}</span> {count === 1 ? "follower" : "followers"}
      </span>
      <Button
        size="sm"
        variant={following ? "outline" : "primary"}
        aria-pressed={following}
        onClick={toggle}
        loading={busy}
        className="min-w-24"
      >
        {!busy && (following ? <Check className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />)}
        {following ? "Following" : "Follow"}
      </Button>
    </div>
  );
}
