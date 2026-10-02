import { BannersManager } from "@/components/admin/banners-manager";
import { PageHeader } from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/guard";
import { listBanners, listEditorial } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminBannersPage() {
  await requireAdminPage("/admin/banners");
  const [banners, editorial] = await Promise.all([listBanners(), listEditorial()]);
  return (
    <>
      <PageHeader title="Banners & editorial" description="Home carousel banners and GLAM Edit cards. Lower positions show first; edit a position inline to reorder." />
      <BannersManager banners={banners} editorial={editorial} />
    </>
  );
}
