import { Lock } from "lucide-react";
import { BadgesProvider } from "@/components/layout/badges-provider";
import { Logo } from "@/components/layout/logo";
import { ToastProvider } from "@/components/ui/toast";
import { getUser } from "@/lib/auth/session";

/** Distraction-free checkout shell: logo + "Secure checkout", no navigation. */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser().catch(() => null);
  return (
    <ToastProvider>
      <BadgesProvider initial={{ isLoggedIn: Boolean(user) }}>
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:h-16">
            <Logo />
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
              <Lock className="h-4 w-4 text-success" aria-hidden /> Secure checkout
            </span>
          </div>
        </header>
        <main className="flex-1 bg-surface/50">{children}</main>
      </BadgesProvider>
    </ToastProvider>
  );
}
