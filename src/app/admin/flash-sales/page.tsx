import { FlashSalesManager } from "@/components/admin/flash-sales-manager";
import { PageHeader } from "@/components/admin/data-table";
import { requireAdminPage } from "@/lib/admin/guard";
import { flashSalePhase } from "@/lib/admin/rules";
import { listFlashSales } from "@/lib/admin/service";

export const dynamic = "force-dynamic";

export default async function AdminFlashSalesPage() {
  await requireAdminPage("/admin/flash-sales");
  const now = new Date();
  const sales = (await listFlashSales()).map((s) => ({ ...s, phase: flashSalePhase(s, now) }));
  return (
    <>
      <PageHeader title="Flash sales" description="Only one sale is live at a time (the most recently started active sale within its window). Sale prices beat Pro prices at checkout." />
      <FlashSalesManager sales={sales} />
    </>
  );
}
