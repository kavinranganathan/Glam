# GLAM — Beauty & Lifestyle Marketplace (Web)

Web implementation of the GLAM PRD v1.0 (Phase 1 / MVP scope). Mobile-first, responsive, built on Next.js 16 and Supabase.

- Spec: [docs/superpowers/specs/2026-10-02-glam-web-design.md](docs/superpowers/specs/2026-10-02-glam-web-design.md)
- Plan: [docs/superpowers/plans/2026-10-02-glam-web.md](docs/superpowers/plans/2026-10-02-glam-web.md)

## 1. Setup

### Prerequisites

- Node 20+ (tested on 24), npm
- A Supabase project (free tier is fine)
- Optional: Homebrew `postgresql@16` for local migration validation and type generation

### Steps

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` (or `.env`) and fill in from Supabase → Project Settings → API:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   ```

3. **Database** — apply, in order, in the Supabase SQL editor (or `DATABASE_URL=... npm run db:push`):

   - `supabase/migrations/0001_schema.sql` — tables, enums, triggers
   - `supabase/migrations/0002_rls.sql` — row-level security
   - `supabase/migrations/0003_functions.sql` — transactional functions (`place_order`, `confirm_payment`, `advance_order`, `create_return`, `submit_review`, …)
   - `supabase/seed.sql` — 30 brands, 8 categories / 24 subcategories, ~210 products, ~560 variants, 40 pincodes, coupons, banners, editorial cards, an active flash sale
   - `supabase/migrations/0004_fix_accented_slugs.sql` — only if you seeded before 2 Oct 2026 evening (renames `lumi-re-skin` → `lumiere-skin`)

4. **Auth (email OTP + magic link)** — in Supabase → Authentication:

   - Providers → Email: enabled (default). Keep "Confirm email" on.
   - URL Configuration → Site URL `http://localhost:3000`, Redirect URLs add `http://localhost:3000/auth/callback`.
   - Email Templates → *Magic Link*: include the 6-digit code so the in-app OTP input works, e.g.

     ```html
     <h2>Your GLAM sign-in code</h2>
     <p>Enter this code in the app: <b>{{ .Token }}</b></p>
     <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a>.</p>
     ```

   - Phone OTP (the PRD's primary method) and Google sign-in can be enabled later in the dashboard; the login form is email-first by decision (see spec §1).

5. **Make yourself admin** (after your first login):

   ```sql
   update profiles set role = 'admin' where email = 'you@example.com';
   ```

6. **Run**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000. The admin area is at `/admin`.

## 2. Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next + React hooks rules) |
| `npm test` | Vitest unit tests for business logic (pricing, coupons, loyalty, order state machine, returns, search parsing, recommendations, rate limiting) |
| `npm run db:validate` | Spins up a throwaway local Postgres 16, applies migrations + seed, runs `scripts/sql/smoke.sql` (full order → payment → fulfilment → review → return → refund flow, out-of-stock, COD limit, RLS checks) |
| `npm run db:push` | Applies migrations + seed to `DATABASE_URL` |
| `bash scripts/db-types.sh` | Regenerates `src/lib/supabase/types.generated.ts` from the migrations |
| `npx tsx scripts/generate-seed.ts` | Regenerates `supabase/seed.sql` deterministically |

## 3. Architecture

```
src/app                 App Router routes (server components + route handlers under /api)
  (shop)/               storefront: home, explore, search, c/[slug], p/[slug], b/[slug], bag, wishlist, orders, profile/*, …
  (checkout)/           checkout + simulated payment page
  (auth)/login          email OTP / magic link
  admin/                ops dashboard (role = admin)
src/components          ui primitives (PRD §12.2 tokens), layout shell, product/cart/checkout/order components
src/lib
  pricing/              pure pricing engine: flash > Pro > base price, Buy-X-Get-Y, coupons, points, delivery, COD fee
  loyalty/              tiers, multipliers, points rules
  orders/               state machine (mirrors SQL `order_status_allowed`)
  returns/              return windows and rules
  catalogue/            product queries, full-text search, facets, recently viewed
  recommendations/      profile-first scoring + home shelves
  cart/, wishlist/      services (guest carts keyed by cookie session; merged on login)
  payments/             PaymentProvider interface + simulated gateway
  notifications/        in-app notifications + outbox (simulated SMS/email/push), prefs, quiet hours
  supabase/             server (cookie) / browser / service-role clients, generated DB types
  auth/                 session helpers, guest session, post-login merge + referral
supabase/migrations     schema, RLS, SQL functions (all money in integer paise)
tests/                  Vitest
```

**Data access rule:** reads for the current user go through the cookie-bound client under RLS; business writes (orders, stock, points, admin) go through the service-role client inside server code and the SQL functions, which are the single place that mutate stock, points, coupons and order status.

## 4. What is simulated

No vendor keys exist, so these run against in-app simulators behind interfaces that a real adapter can replace:

| Capability | PRD vendor | Here |
|---|---|---|
| Payments (UPI, cards, net banking, wallets, EMI, BNPL, COD) | Razorpay / Cashfree | `/checkout/pay/[orderId]` simulated gateway; `PaymentProvider` interface in `src/lib/payments` |
| SMS / email / push | MSG91, SendGrid, FCM | Rows in the `outbox` table + in-app notification centre |
| Courier tracking | Delhivery etc. | Admin "advance status" / "simulate fulfilment" writes courier + AWB and timeline events |
| Search | Typesense | Postgres full-text (`tsvector`) + trigram fallback |
| Recommendations | ML engine | Rules engine using the beauty profile, tags and sales |
| Maps autocomplete | Google Places | Plain address form + pincode serviceability table |
| Product imagery | Brand assets | Deterministic placeholder photos (`picsum.photos`, keyed by SKU) |

## 5. PRD coverage (Phase 1)

| PRD section | Status |
|---|---|
| 8.1 Onboarding & auth (S01–S05) | Onboarding carousel (once), email OTP/magic link, guest browsing, DPDP consent, 7-question beauty profile with welcome coupon |
| 8.2 Home feed | Banners, category pills, personalised, trending, new launches, brands you love, editorial, flash sale timer, continue shopping, best sellers, Pro upsell |
| 8.3 Search & filters | Overlay with recent/trending/autocomplete/voice, results with 7 sorts and sponsored slots, 13 filter facets |
| 8.4 PLP | Breadcrumb, counts, sticky sort/filter, 2/1 column toggle, infinite scroll, badges, quick add, OOS "Notify me" |
| 8.5 PDP | Gallery + zoom, variants with shade swatches, pincode check, Add to Bag / Buy Now, accordion, ratings & reviews with filters, Q&A, FBT / also like / also viewed |
| 8.6 Cart & wishlist | Qty stepper with stock caps, saved for later, coupons, points redemption, delivery estimates, free-delivery nudge, collections, price-drop / back-in-stock badges, share link |
| 8.7 Checkout & payment | Guest or signed-in checkout, address book, slots (standard / next-day / same-day before noon), offers, 7 payment methods, 3-attempt failure policy, confirmation + invoice |
| 8.8 Orders | Status timeline with PRD labels, cancel window (30 min / processing), reorder, invoice |
| 8.9 Returns | Category windows (30/14/7 days), reasons, photo rules, refund to original or wallet, pickup + refund timeline |
| 8.10 Account | Profile, addresses, payment methods, rewards, reviews, coupons, help, notification prefs, privacy (export / delete), settings, logout |
| 8.11 Loyalty | 4 tiers, multipliers, points ledger, 12-month expiry, referral 200 pts, review bonus 50/20 |
| 8.12 Notifications | Transactional + opt-in types, 90-day centre, deep links, quiet hours |
| 8.13 Reviews & Q&A | Verified purchase gate, 24h–90d window, min 30 chars, photos, helpful votes, brand response (admin) |
| 8.14 Brand storefronts | Cover, tabs, follow |
| 8.15 Offers | Percent / flat / free-delivery coupons with scopes, Buy-X-Get-Y, flash sale, Pro price, welcome coupon |
| 8.17 Admin (subset) | Orders, returns, banners, flash sales, coupons, review responses |
| 9 NFRs | RLS, service-role isolation, rate limiting, 44px targets, focus rings, reduced motion, skeletons, server rendering |
| 10 Analytics | PRD event taxonomy captured to `analytics_events` via `sendBeacon` |

Phase 2/3 items (visual search, AR, shade-match AI, live shopping, Hindi UI, social feed, biometric login) are out of scope by design.

## 6. Known limitations

- Login is email OTP / magic link only (decision for this build); phone OTP and Google need dashboard configuration and a login-form tweak.
- One return request per order (the `create_return` function moves the order to `return_initiated`); guest orders cannot be returned without signing in.
- Search relevance ordering is a popularity proxy (PostgREST exposes no `ts_rank`); discount filters/sorts are applied in memory over at most 1,000 matches.
- Rate limiting is per server process (in-memory). Use Redis or Supabase edge limits when scaling out.
- Product photos are placeholders; the Supabase Storage bucket `uploads` is created lazily on first review/return photo upload.

## 7. Try the full flow

1. Sign in at `/login` (6-digit code from the email), complete the beauty profile → welcome coupon.
2. Browse `/`, `/search?q=serum`, a category, a product → Add to Bag / Buy Now.
3. `/bag` → apply `GLAM200` (≥ ₹999) or the welcome code → Checkout → pick address, slot, payment → simulated gateway → Pay.
4. `/orders/<id>/confirmation`, then as an admin open `/admin/orders/<id>` → "Simulate fulfilment" → the order reaches Delivered, points are credited, notifications appear in `/notifications`.
5. On the delivered order: Rate & Review (+50 points with a photo), or Return → `/returns/<id>`; the admin advances the return to Refunded (wallet credit is instant).
