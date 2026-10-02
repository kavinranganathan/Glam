import { ok } from "@/lib/api/respond";
import { parseBody } from "@/lib/api/validate";
import { adminHandle } from "@/lib/admin/route";
import { editorialSchema } from "@/lib/admin/schemas";
import { createEditorial, listEditorial } from "@/lib/admin/service";

export const GET = adminHandle(async () => ok(await listEditorial()));

export const POST = adminHandle(async (req) => ok(await createEditorial(await parseBody(req, editorialSchema)), { status: 201 }));
