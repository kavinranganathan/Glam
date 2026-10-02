"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const notConfigured = /Missing environment variable/.test(error.message);
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <EmptyState
        icon={<TriangleAlert className="h-8 w-8" aria-hidden />}
        title={notConfigured ? "GLAM isn't connected to Supabase yet" : "Something went wrong"}
        description={
          notConfigured
            ? "Copy .env.example to .env.local, add your Supabase project URL and keys, then restart the dev server."
            : "We hit an unexpected error. Please try again, or head back home."
        }
        action={{ label: "Try again", onClick: reset }}
        secondary={{ label: "Go to Home", href: "/" }}
      />
    </div>
  );
}
