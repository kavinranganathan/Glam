import { CouponsManager } from "@/components/admin/coupons-manager";
import { PageHeader } from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/guard";
import { listCoupons, listScopeOptions } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdminPage("/admin/coupons");
  const [coupons, scopes] = await Promise.all([listCoupons(), listScopeOptions()]);
  return (
    <>
      <PageHeader title="Coupons" description="Platform coupons. Personal welcome coupons are issued automatically and not listed here." />
      <CouponsManager coupons={coupons} scopes={scopes} />
    </>
  );
}
