import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Logo } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Logo size="lg" />
      <EmptyState
        icon={<SearchX className="h-8 w-8" aria-hidden />}
        title="We couldn't find that page"
        description="The link may be broken or the product may no longer be available. Let's get you back to something beautiful."
        action={{ label: "Go to Home", href: "/" }}
        secondary={{ label: "Explore categories", href: "/explore" }}
      />
    </div>
  );
}
