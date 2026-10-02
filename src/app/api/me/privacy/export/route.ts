import { handle } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { exportUserData } from "@/lib/account/privacy";

/** DPDP "right to access": JSON download of everything we hold about the user. */
export const GET = handle(async () => {
  const user = await requireUser();
  const data = await exportUserData(user.id);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="glam-data-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
