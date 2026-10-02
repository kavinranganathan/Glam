"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

export class AdminApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * JSON fetch helper for admin mutations: surfaces `{ error }` bodies as toasts,
 * refreshes the current server-rendered route on success and tracks a busy flag.
 */
export function useAdminApi() {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  const call = React.useCallback(
    async <T,>(method: Method, url: string, body?: unknown, opts: { success?: string; refresh?: boolean } = {}): Promise<T | null> => {
      setBusy(true);
      try {
        const res = await fetch(url, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const json = (await res.json().catch(() => null)) as (T & { error?: { code: string; message: string } }) | null;
        if (!res.ok) {
          const err = json?.error;
          throw new AdminApiError(err?.code ?? "ERROR", err?.message ?? `Request failed (${res.status})`, res.status);
        }
        if (opts.success) toast({ title: opts.success, tone: "success" });
        if (opts.refresh !== false) router.refresh();
        return json as T;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Something went wrong";
        toast({ title: "Action failed", description: message, tone: "error" });
        return null;
      } finally {
        setBusy(false);
      }
    },
    [router, toast],
  );

  return { call, busy };
}
