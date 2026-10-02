import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle } from "@/lib/admin/route";
import { bannerSchema } from "@/lib/admin/schemas";
import { createBanner, listBanners } from "@/lib/admin/service";

export const GET = adminHandle(async () => ok(await listBanners()));

export const POST = adminHandle(async (req) => ok(await createBanner(await parseBody(req, bannerSchema)), { status: 201 }));
