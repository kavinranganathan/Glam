# GLAM Web Application — Design Spec

Date: 2026-10-02
Source: `glam prd complete.docx` (GLAM E-Commerce Marketplace PRD v1.0)
Target: Web application only (responsive, mobile-first), Phase 1 (MVP) scope.

## 1. Goal and scope

Build the GLAM beauty & lifestyle marketplace described in the PRD as a web app. The PRD targets iOS/Android; this build delivers the same consumer experience in the browser, mobile-first, with a desktop layout.

**In scope (Phase 1 / MVP):** every P0 screen (S01–S44 marked P0) plus the P1 screens that are cheap to add: notification centre, write a review, Q&A, brand storefront, saved for later, refund status, offers & coupons, flash sale landing, notification preferences, GLAM Pro. A minimal admin area (orders, banners, flash sales, coupons) so the order lifecycle can be exercised end to end.

**Out of scope (Phase 2+ in the PRD):** visual search, AR, shade-match AI, live shopping, social feed, Hindi UI, auto-replenish, biometric login, 360° media, in-store pickup, NFT collectibles, full seller portal, finance reconciliation.

**Deliberately adapted for web:**
- Native OS share sheet → Web Share API with clipboard fallback.
- Apple Sign-In (App Store requirement) → not needed. Google sign-in available through Supabase when enabled in the dashboard.
- Mobile OTP → Supabase Auth **email OTP / magic link** (user decision, 2026-10-02). Phone OTP can be switched on later in the Supabase dashboard without code changes beyond the login form.
- Push notifications → in-app notification centre backed by a `notifications` table; SMS/email/push sends are recorded in an `outbox` table (simulated channels).
- Live courier map → status timeline with simulated courier events.
- Payments → `PaymentProvider` interface with a working **simulated gateway** (UPI, card, net banking, wallet, EMI, BNPL, COD). Razorpay adapter can be added behind the same interface once keys exist.
- Google Places autocomplete → plain address form with pincode serviceability lookup.

## 2. Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Server components for SEO-able catalogue pages, route handlers for JSON APIs, one deployable. |
| Styling | Tailwind CSS with PRD design tokens | Tokens in §12.2 map directly to a Tailwind theme. |
| Database | Supabase Postgres | User decision. SQL migrations in `supabase/migrations`, seed in `supabase/seed.sql`. |
| Auth | Supabase Auth (email OTP + magic link) via `@supabase/ssr` cookies | User decision. `profiles` row auto-created by trigger on `auth.users`. |
| Data access | `@supabase/supabase-js`: cookie-bound client for user-scoped reads/writes under RLS; service-role client only inside server code for privileged operations (order placement, stock, loyalty, admin). | Keeps RLS meaningful while business logic stays in one place. |
| Atomic operations | Postgres functions (`place_order`, `decrement_stock`, `award_points`) called via RPC | Stock decrement and order creation must be transactional. |
| Search | Postgres full-text (`tsvector` + trigram) with facet counts | Good enough for the seeded catalogue; swappable for Typesense later. |
| Recommendations | Rules engine in app code using beauty profile + tags + sales counts | PRD's ML engine is Phase 2+; rules produce the same shelves. |
| Tests | Vitest for business logic (pricing, coupons, loyalty, order state machine, recommendations). SQL migrations validated against a local Postgres when available. | DoD in PRD §20.1 requires unit tests for business logic. |

Money is stored as integer paise. Dates are UTC timestamps.

### 2.1 Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Migrations are applied with the Supabase CLI (`supabase db push`) or by pasting into the SQL editor. The seed is plain SQL.

## 3. Data model (Postgres, schema `public`)

Core entities, all with `id uuid default gen_random_uuid()`, `created_at`, `updated_at` unless noted.

- **profiles** (id = auth.users.id): name, email, phone, avatar_url, role (`user`/`admin`), marketing_consent, dob, referral_code (unique), referred_by, pro_until, wallet_balance, points_balance.
- **beauty_profiles** (user_id PK): skin_type, skin_tone (1–12), concerns[], hair_type, shopping_for[], style_prefs[], budget, completed_at.
- **addresses**: user_id, label, name, phone, line1, line2, landmark, city, state, pincode, is_default.
- **pincodes**: pincode PK, city, state, same_day, next_day, delivery_fee, cod_available.
- **brands**: slug, name, logo_url, cover_url, tagline, about, verified, tier, socials jsonb, certifications[].
- **categories**: slug, name, parent_id, image_url, position, return_window_days.
- **products**: slug, name, brand_id, category_id, description, benefits[], ingredients[], how_to_use[], certifications[], skin_types[], concerns[], free_from[], finish, images[], video_url, price, mrp, pro_price, rating_avg, rating_count, sold_count, is_active, launched_at, offer_type (`none`/`bxgy`), offer_buy, offer_get, search tsvector (generated).
- **variants**: product_id, sku (unique), name, kind (`default`/`shade`/`size`), shade_hex, price, mrp, stock, is_default.
- **carts**: user_id (unique, nullable), session_id (unique, nullable), coupon_code, use_points.
- **cart_items**: cart_id, variant_id, qty, saved_for_later.
- **wishlist_collections**: user_id, name, is_default, share_token. **wishlist_items**: collection_id, product_id, variant_id, price_at_add.
- **coupons**: code, kind (`percent`/`flat`/`free_delivery`), value, max_discount, min_order, scope (`all`/`brand`/`category`), scope_id, user_id (personal), starts_at, ends_at, usage_limit, used_count, per_user_limit, pro_only, description. **coupon_redemptions**: coupon_id, user_id, order_id.
- **flash_sales**: name, starts_at, ends_at, is_active, banner_url. **flash_sale_items**: flash_sale_id, product_id, sale_price.
- **banners**: title, subtitle, image_url, cta_label, href, position, is_active, starts_at, ends_at. **editorial_cards**: title, excerpt, image_url, href, position.
- **orders**: order_number (unique, `GLM-YYYYMMDD-XXXX`), user_id, guest_email, status, address jsonb, subtotal, item_discount, coupon_code, coupon_discount, points_redeemed, points_discount, delivery_fee, cod_fee, tax, total, payment_method, payment_status, delivery_slot, estimated_delivery, courier, awb, placed_at, delivered_at, cancelled_at.
- **order_items**: order_id, product_id, variant_id, snapshots (name, brand, variant, image), qty, unit_price, mrp, line_total, status.
- **order_events**: order_id, status, note. **payments**: order_id, method, provider, provider_ref, amount, status, attempt.
- **returns**: order_id, user_id, reason, refund_method, photos[], status, awb, refund_amount, pickup_address jsonb. **return_items**: return_id, order_item_id, qty.
- **reviews**: product_id, user_id, order_item_id (unique), rating, title, body, photos[], skin_type, concerns[], helpful_count, status, brand_response. **review_votes** (review_id, user_id).
- **questions**: product_id, user_id, body, reported. **answers**: question_id, user_id, brand_id, body, reported.
- **points_ledger**: user_id, delta, balance_after, reason, ref_type, ref_id, expires_at.
- **notifications**: user_id, type, title, body, href, read_at. **notification_prefs** (user_id PK): orders, offers, reviews, loyalty, personalised.
- **brand_follows** (user_id, brand_id). **stock_alerts** (user_id, variant_id, notified_at). **recently_viewed** (user_id/session_id, product_id, viewed_at). **search_history** (user_id/session_id, query).
- **saved_payment_methods**: user_id, kind, label, token.
- **support_tickets**: user_id, subject, body, status.
- **outbox**: channel (`sms`/`email`/`push`), to, subject, body, payload jsonb.

Order statuses (PRD §8.8.1): `placed → processing → shipped → out_for_delivery → delivered`, with `failed_delivery`, `cancelled`, `return_initiated`, `returned`, `refunded`. The state machine in `src/lib/orders/state-machine.ts` is the single source of allowed transitions and consumer labels.

RLS: users read/write only their own rows on user-scoped tables; catalogue tables are publicly readable; admin tables writable only via service role. Guests use a `glam_session` cookie for carts, recently viewed and search history (service-role writes keyed by session id).

## 4. Application structure

```
src/
  app/                      routes (see §5)
  components/               ui primitives, layout (app bar, bottom nav, desktop nav), product cards, shelves
  lib/
    supabase/               server/browser/service clients, typed helpers
    auth/                   current user, session cookie, guest session
    catalogue/              product queries, search, facets
    cart/                   cart service (merge on login)
    pricing/                pricing engine: line prices, BxGy, flash sale, Pro price, coupons, points, delivery, COD fee, tax
    orders/                 place_order, state machine, timeline, cancellation rules
    returns/                return policy (window per category), flow
    loyalty/                tiers, points rules, referral, review bonus
    recommendations/        shelves (personalised, trending, new launches, brands you love, continue shopping, best sellers)
    notifications/          create notification + outbox send
    payments/               PaymentProvider interface + simulated provider
    analytics/              event taxonomy (PRD §10.2) logged to `analytics_events`
supabase/
  migrations/               numbered SQL files
  seed.sql                  brands, categories, ~200 products with variants, pincodes, coupons, banners, flash sale
```

## 5. Routes and screens

| Route | PRD screens |
|---|---|
| `/` | S06 home feed (banners, category pills, personalised, trending, new launches, brands you love, editorial, flash sale timer, continue shopping, best sellers, Pro upsell). S02 onboarding carousel shown once as an overlay on first visit (localStorage flag). |
| `/login`, `/auth/callback` | S03/S04 email OTP + magic link; consent checkbox; guest continue |
| `/profile/beauty` | S05 beauty profile setup and edit; completion grants welcome coupon |
| `/explore`, `/search` | S08 overlay (recent, trending, autocomplete), S09 results with sort and sponsored slots |
| `/c/[slug]` | S10/S11 category landing + PLP with S12 filter panel, 2/1 column toggle, infinite scroll |
| `/p/[slug]` | S13–S19 PDP: gallery, variants, pincode check, CTAs, accordion, reviews, Q&A, complementary shelves |
| `/b/[slug]` | S20 brand storefront with tabs and follow |
| `/bag` | S21 cart (+ S23 saved for later), coupon, points, upsell shelf |
| `/wishlist`, `/wishlist/s/[token]` | S22 collections, price-drop / back-in-stock badges, share |
| `/checkout`, `/checkout/pay/[orderId]`, `/orders/[id]/confirmation` | S24–S30 |
| `/orders`, `/orders/[id]`, `/orders/[id]/return`, `/returns/[id]` | S31–S34 |
| `/profile/*` | S35–S37, S40–S44: profile, edit, addresses, payments, rewards, reviews, coupons, help, settings & privacy, notification prefs, Pro |
| `/notifications` | S07 |
| `/offers`, `/flash-sale` | S38, S39 |
| `/admin/*` | PRD §8.17 subset: orders (advance status, simulate courier), banners, flash sales, coupons |

Navigation: bottom tab bar on mobile (Home, Explore, Bag, Wishlist, Profile) with badges; top nav on desktop. Global app bar with logo, search stub, bell, bag.

## 6. Key flows

**Login:** enter email → Supabase sends OTP/magic link → verify 6-digit code on the same page or land on `/auth/callback` → if no beauty profile, route to `/profile/beauty`, else home. Guest cart (session cookie) merges into user cart on login. `?ref=CODE` on login stores referral.

**Pricing (pure function, tested):** inputs = cart lines (variant, qty, product), active flash sale prices, user (Pro?, tier, points balance), coupon, address pincode, payment method. Steps: unit price (flash > Pro > variant) → BxGy line discount → subtotal → coupon (scope, min order, max discount, Pro-only, usage limits) → points redemption (1 pt = ₹0.25, capped at remaining total) → delivery fee (free above ₹999, free for Silver+, else pincode fee) → COD fee ₹40 on COD → tax shown as "inclusive" (0 added). Points earned = floor(eligible paise / 1000) × tier multiplier, excluding delivery, taxes, COD fee and points-paid portion.

**Checkout:** address select/add (pincode serviceability) → delivery slot → offers → payment method → `place_order` RPC (validates stock, decrements, writes order + items + events + payment row) → simulated gateway page → success marks `paid`, sends confirmation (outbox + notification), awards referral points on referrer's first qualifying order; failure allows retry up to 3 attempts, then order is cancelled and stock restored.

**Order lifecycle:** admin advances status (or "simulate fulfilment" button runs the full happy path with timestamps). Cancel allowed by user within 30 min of placement or while `processing`. Delivery triggers points credit, review prompt notification, and starts return window.

**Returns:** from a delivered order, pick items, reason (photo required for damaged/wrong/defective), refund method (original or wallet), confirm → return row with simulated AWB → admin marks received → refund processed (wallet instant, original "5–7 days" message).

**Reviews:** only owners of a delivered order item for that product, 24h–90d after delivery; 30-char minimum; up to 5 photo URLs; auto-approved; 50/20 points credited. Helpful votes. Brand response field editable in admin.

**Loyalty:** tiers from rolling 12-month paid spend (Base/Silver/Gold/Platinum); points ledger with expiry; referral 200 pts; birthday handled as coupon.

**Notifications:** every transactional trigger in PRD §8.12 that this build can fire (order confirmed/shipped/out for delivery/delivered, back in stock, price drop, tier upgrade, referral reward, review prompt) creates a notification row and an outbox record; marketing types respect `notification_prefs`.

## 7. Error handling and resilience

- All route handlers return `{ error: { code, message } }` with correct HTTP status; UI shows toasts and inline errors, never blank screens (PRD "Zero dead ends").
- Shelves degrade independently: if a recommendation query fails, the shelf falls back to best sellers.
- Optimistic UI for wishlist, cart quantity and filters, with rollback on failure.
- Stock race: `place_order` locks variant rows and fails with `OUT_OF_STOCK` listing the offending SKUs.
- Rate limiting: in-memory token bucket per IP on auth and write endpoints (100 req/min per user, 1000 per IP).

## 8. Accessibility, performance, design

- Design tokens from PRD §12.2 as Tailwind theme (`primary #DB2777`, `secondary #7C3AED`, grays, success/warning/error). Inter for body; Plus Jakarta Sans as the display face (Satoshi is not freely hosted).
- 44px minimum touch targets, 4.5:1 contrast, visible focus rings, `prefers-reduced-motion` respected, all images with alt text, no colour-only meaning (badges carry text).
- Skeleton loaders for shelves and PLP batches, `next/image` with lazy loading, server-rendered catalogue pages.

## 9. Testing

- Vitest unit tests: pricing engine, coupon validation, loyalty (tiers, points, expiry), order state machine, return policy windows, recommendation scoring, search query parsing.
- `npm run typecheck`, `npm run lint`, `npm run build` must pass.
- SQL migrations and seed validated against a local Postgres when one is available; otherwise against the hosted project once keys are provided.

## 10. Assumptions

- Returns: category-specific windows (30 beauty / 14 fashion / 7 wellness) per PRD §8.9.
- COD limit ₹20,000 per PRD §8.7.3.
- GLAM Pro: ₹299/month, purchased through the same simulated gateway.
- Guest cart persists 30 days via cookie.
- Reviews are verified-purchase only.
- Product imagery uses deterministic placeholder photos (picsum) keyed by SKU, since no catalogue assets exist.
