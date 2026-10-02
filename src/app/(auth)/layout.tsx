import { Logo } from "@/components/layout/logo";
import { ToastProvider } from "@/components/ui/toast";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-gradient-to-b from-primary-soft via-background to-background">
        <header className="flex items-center justify-center p-6">
          <Logo size="lg" />
        </header>
        <main className="flex flex-1 items-start justify-center px-4 pb-12">{children}</main>
      </div>
    </ToastProvider>
  );
}
