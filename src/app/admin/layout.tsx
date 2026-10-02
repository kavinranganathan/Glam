import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { ToastProvider } from "@/components/ui/toast";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata: Metadata = { title: "GLAM Admin", robots: { index: false, follow: false } };

/** Admin shell: guests → /login?next=/admin, non-admins → /. Sidebar on desktop, top tabs on mobile. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage("/admin");
  return (
    <ToastProvider>
      <div className="flex min-h-screen flex-col bg-surface md:flex-row">
        <AdminSidebar userName={user.name ?? user.email} />
        <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">{children}</main>
      </div>
    </ToastProvider>
  );
}
