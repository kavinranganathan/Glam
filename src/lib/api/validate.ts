import type { ZodType } from "zod";
import { ApiError } from "./respond";

/** Parse a JSON body with a zod schema. Throws ApiError(400) for malformed JSON; ZodError for shape issues. */
export async function parseBody<T>(req: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "BAD_JSON", "Request body must be valid JSON.");
  }
  return schema.parse(raw);
}

export function parseQuery<T>(req: Request, schema: ZodType<T>): T {
  const url = new URL(req.url);
  const obj: Record<string, string | string[]> = {};
  for (const [k, v] of url.searchParams.entries()) {
    if (k in obj) {
      const cur = obj[k];
      obj[k] = Array.isArray(cur) ? [...cur, v] : [cur, v];
    } else {
      obj[k] = v;
    }
  }
  return schema.parse(obj);
}
