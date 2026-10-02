import { z } from "zod";
import { handle, ok } from "@/lib/api/respond";
import { parseQuery } from "@/lib/api/validate";
import { getGuestSessionId } from "@/lib/auth/guest";
import { getUser } from "@/lib/auth/session";
import { getTrendingSearches } from "@/lib/catalogue/queries";
import { clearRecentSearches, getRecentSearches, removeRecentSearch } from "@/lib/catalogue/recently-viewed";

/** GET /api/search/recent -> { recent, trending } for the current user or guest session. */
export const GET = handle(async () => {
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  const [recent, trending] = await Promise.all([getRecentSearches(user, sessionId), getTrendingSearches()]);
  return ok({ recent, trending });
});

const deleteSchema = z.object({ q: z.string().max(120).optional() });

/** DELETE /api/search/recent?q=term removes one entry; without q clears all. */
export const DELETE = handle(async (req) => {
  const { q } = parseQuery(req, deleteSchema);
  const [user, sessionId] = await Promise.all([getUser(), getGuestSessionId()]);
  if (q && q.trim()) await removeRecentSearch(q, user, sessionId);
  else await clearRecentSearches(user, sessionId);
  return ok({ ok: true });
});
