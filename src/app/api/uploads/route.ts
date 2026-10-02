import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError, handle, ok } from "@/lib/api/respond";
import { requireUser } from "@/lib/auth/session";
import { serviceClient } from "@/lib/supabase/service";

const BUCKET = "uploads";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/avif": "avif",
};

async function ensureBucket(): Promise<void> {
  const { error } = await serviceClient().storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES });
  if (error && !/already exists|duplicate/i.test(error.message)) throw error;
}

async function uploadToStorage(key: string, bytes: Uint8Array, contentType: string): Promise<string> {
  await ensureBucket();
  const storage = serviceClient().storage.from(BUCKET);
  const { error } = await storage.upload(key, bytes, { contentType, upsert: false });
  if (error) throw error;
  return storage.getPublicUrl(key).data.publicUrl;
}

async function uploadToDisk(key: string, bytes: Uint8Array): Promise<string> {
  const name = key.replace(/\//g, "-");
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${name}`;
}

/**
 * POST /api/uploads (multipart, field `file`; images ≤5MB) → { url }.
 * Supabase Storage bucket `uploads` first, local `public/uploads` as a dev fallback.
 */
export const POST = handle(async (req) => {
  const user = await requireUser();
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "BAD_FORM", "Expected multipart form data with a `file` field.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "VALIDATION", "Attach an image in the `file` field.");
  const ext = EXT_BY_TYPE[file.type];
  if (!ext) throw new ApiError(415, "UNSUPPORTED_TYPE", "Only JPG, PNG, WebP, GIF, HEIC or AVIF images are allowed.");
  if (file.size > MAX_BYTES) throw new ApiError(413, "TOO_LARGE", "Images must be 5MB or smaller.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const key = `${user.id}/${crypto.randomUUID()}.${ext}`;
  try {
    return ok({ url: await uploadToStorage(key, bytes, file.type) }, { status: 201 });
  } catch (e) {
    console.warn("[uploads] storage failed, falling back to public/uploads", e instanceof Error ? e.message : e);
    return ok({ url: await uploadToDisk(key, bytes) }, { status: 201 });
  }
});
