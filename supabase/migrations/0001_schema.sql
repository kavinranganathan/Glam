-- GLAM marketplace schema (PRD v1.0, Phase 1)
-- All money columns are integer paise. All timestamps are timestamptz (UTC).

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role as enum ('user', 'admin');
create type skin_type as enum ('oily', 'dry', 'combination', 'normal', 'sensitive');
create type hair_type as enum ('straight', 'wavy', 'curly', 'coily');
create type budget_band as enum ('under_500', '500_1500', '1500_4000', '4000_plus');
create type variant_kind as enum ('default', 'shade', 'size');
create type offer_type as enum ('none', 'bxgy');
create type coupon_kind as enum ('percent', 'flat', 'free_delivery');
create type coupon_scope as enum ('all', 'brand', 'category');
create type order_status as enum (
  'placed', 'processing', 'shipped', 'out_for_delivery', 'delivered',
  'failed_delivery', 'cancelled', 'return_initiated', 'returned', 'refunded'
);
create type payment_status as enum ('pending', 'paid', 'cod_pending', 'failed', 'refunded');
create type payment_method as enum ('upi', 'card', 'netbanking', 'wallet', 'emi', 'bnpl', 'cod', 'giftcard');
create type payment_state as enum ('initiated', 'success', 'failed', 'refunded');
create type delivery_slot as enum ('standard', 'next_day', 'same_day');
create type return_status as enum ('requested', 'pickup_scheduled', 'picked_up', 'received', 'refunded', 'rejected');
create type refund_method as enum ('original', 'wallet');
create type review_status as enum ('pending', 'approved', 'rejected');
create type notification_type as enum (
  'order_confirmed', 'order_shipped', 'out_for_delivery', 'delivered', 'order_cancelled',
  'back_in_stock', 'price_drop', 'flash_sale', 'abandoned_cart', 'browse_abandonment',
  'weekly_digest', 'review_prompt', 'tier_upgrade', 'points_expiring', 'referral_reward',
  'return_update', 'refund_processed', 'welcome', 'coupon', 'brand_launch', 'support'
);
create type outbox_channel as enum ('sms', 'email', 'push');
create type ticket_status as enum ('open', 'in_progress', 'resolved');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function generate_referral_code() returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
begin
  for i in 1..6 loop
    code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  end loop;
  return 'GLAM' || code;
end $$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  avatar_url text,
  role user_role not null default 'user',
  marketing_consent boolean not null default false,
  dob date,
  referral_code text not null unique default generate_referral_code(),
  referred_by uuid references profiles(id),
  referral_rewarded_at timestamptz,
  pro_until timestamptz,
  wallet_balance integer not null default 0,
  points_balance integer not null default 0,
  lifetime_spend integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

create table beauty_profiles (
  user_id uuid primary key references profiles(id) on delete cascade,
  skin_type skin_type,
  skin_tone smallint check (skin_tone between 1 and 12),
  concerns text[] not null default '{}',
  hair_type hair_type,
  shopping_for text[] not null default '{}',
  style_prefs text[] not null default '{}',
  budget budget_band,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger beauty_profiles_updated before update on beauty_profiles for each row execute function set_updated_at();

create table notification_prefs (
  user_id uuid primary key references profiles(id) on delete cascade,
  orders boolean not null default true,
  offers boolean not null default true,
  reviews boolean not null default true,
  loyalty boolean not null default true,
  personalised boolean not null default true,
  updated_at timestamptz not null default now()
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  label text not null default 'Home',
  name text not null,
  phone text not null,
  line1 text not null,
  line2 text,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on addresses(user_id);
create trigger addresses_updated before update on addresses for each row execute function set_updated_at();

create table pincodes (
  pincode text primary key,
  city text not null,
  state text not null,
  same_day boolean not null default false,
  next_day boolean not null default true,
  delivery_fee integer not null default 4900,
  cod_available boolean not null default true,
  standard_days smallint not null default 4,
  courier text not null default 'Delhivery'
);

create table saved_payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind payment_method not null,
  label text not null,
  token text not null,
  created_at timestamptz not null default now()
);
create index saved_payment_methods_user_idx on saved_payment_methods(user_id);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  logo_url text,
  cover_url text,
  tagline text,
  about text,
  verified boolean not null default true,
  tier smallint not null default 2,           -- 1 = top partner (sponsored slots), 2 = standard
  socials jsonb not null default '{}'::jsonb,
  certifications text[] not null default '{}',
  follower_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references categories(id),
  image_url text,
  position smallint not null default 0,
  root text not null default 'beauty' check (root in ('beauty', 'fashion', 'wellness')),
  return_window_days smallint not null default 30,
  created_at timestamptz not null default now()
);
create index categories_parent_idx on categories(parent_id);

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand_id uuid not null references brands(id),
  category_id uuid not null references categories(id),
  description text not null default '',
  benefits text[] not null default '{}',
  ingredients text[] not null default '{}',
  flagged_ingredients text[] not null default '{}',
  how_to_use text[] not null default '{}',
  certifications text[] not null default '{}',
  skin_types text[] not null default '{}',
  concerns text[] not null default '{}',
  free_from text[] not null default '{}',
  finish text,
  tags text[] not null default '{}',
  images text[] not null default '{}',
  video_url text,
  price integer not null,                    -- min variant price (denormalised)
  mrp integer not null,
  pro_price integer,
  rating_avg numeric(3,2) not null default 0,
  rating_count integer not null default 0,
  base_rating_sum integer not null default 0,     -- seeded baseline (pre-platform ratings)
  base_rating_count integer not null default 0,
  sold_count integer not null default 0,
  view_count integer not null default 0,
  is_active boolean not null default true,
  non_returnable boolean not null default false,
  offer_type offer_type not null default 'none',
  offer_buy smallint not null default 0,
  offer_get smallint not null default 0,
  launched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector
);

create or replace function products_search_update() returns trigger language plpgsql as $$
begin
  new.search :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end $$;
create trigger products_search_tsv before insert or update of name, tags, description on products
  for each row execute function products_search_update();
create index products_brand_idx on products(brand_id);
create index products_category_idx on products(category_id);
create index products_search_idx on products using gin(search);
create index products_name_trgm_idx on products using gin(name gin_trgm_ops);
create index products_price_idx on products(price);
create index products_sold_idx on products(sold_count desc);
create index products_launched_idx on products(launched_at desc);
create trigger products_updated before update on products for each row execute function set_updated_at();

create table variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  kind variant_kind not null default 'default',
  shade_hex text,
  price integer not null,
  mrp integer not null,
  stock integer not null default 0 check (stock >= 0),
  is_default boolean not null default false,
  position smallint not null default 0
);
create index variants_product_idx on variants(product_id);

create table brand_follows (
  user_id uuid not null references profiles(id) on delete cascade,
  brand_id uuid not null references brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, brand_id)
);

create table stock_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  variant_id uuid not null references variants(id) on delete cascade,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, variant_id)
);

create table recently_viewed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  session_id text,
  product_id uuid not null references products(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index recently_viewed_user_idx on recently_viewed(user_id, viewed_at desc);
create index recently_viewed_session_idx on recently_viewed(session_id, viewed_at desc);
create unique index recently_viewed_user_product_idx on recently_viewed(user_id, product_id) where user_id is not null;
create unique index recently_viewed_session_product_idx on recently_viewed(session_id, product_id) where session_id is not null;

create table search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  session_id text,
  query text not null,
  created_at timestamptz not null default now()
);
create index search_history_user_idx on search_history(user_id, created_at desc);
create index search_history_session_idx on search_history(session_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Merchandising
-- ---------------------------------------------------------------------------
create table banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text not null,
  cta_label text not null default 'Shop now',
  href text not null default '/',
  position smallint not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table editorial_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text,
  image_url text not null,
  href text not null default '/',
  position smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table flash_sales (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  banner_url text,
  created_at timestamptz not null default now()
);

create table flash_sale_items (
  flash_sale_id uuid not null references flash_sales(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  sale_price integer not null,
  primary key (flash_sale_id, product_id)
);

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind coupon_kind not null,
  value integer not null default 0,          -- percent (0-100) or flat paise
  max_discount integer,
  min_order integer not null default 0,
  scope coupon_scope not null default 'all',
  scope_id uuid,
  user_id uuid references profiles(id) on delete cascade,  -- personal coupons
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  usage_limit integer,
  used_count integer not null default 0,
  per_user_limit integer not null default 1,
  pro_only boolean not null default false,
  is_active boolean not null default true,
  description text not null default '',
  created_at timestamptz not null default now()
);
create index coupons_user_idx on coupons(user_id);

-- ---------------------------------------------------------------------------
-- Cart & wishlist
-- ---------------------------------------------------------------------------
create table carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references profiles(id) on delete cascade,
  session_id text unique,
  coupon_code text,
  use_points boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);
create trigger carts_updated before update on carts for each row execute function set_updated_at();

create table cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references carts(id) on delete cascade,
  variant_id uuid not null references variants(id) on delete cascade,
  qty integer not null default 1 check (qty between 1 and 10),
  saved_for_later boolean not null default false,
  created_at timestamptz not null default now(),
  unique (cart_id, variant_id)
);
create index cart_items_cart_idx on cart_items(cart_id);

create table wishlist_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  name text not null default 'My Wishlist',
  is_default boolean not null default false,
  share_token text not null unique default encode(gen_random_bytes(9), 'hex'),
  created_at timestamptz not null default now()
);
create index wishlist_collections_user_idx on wishlist_collections(user_id);

create table wishlist_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references wishlist_collections(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  variant_id uuid references variants(id) on delete set null,
  price_at_add integer not null,
  created_at timestamptz not null default now(),
  unique (collection_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create sequence order_number_seq;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references profiles(id) on delete set null,
  session_id text,
  guest_email text,
  status order_status not null default 'placed',
  address jsonb not null,
  subtotal integer not null,
  item_discount integer not null default 0,
  coupon_code text,
  coupon_discount integer not null default 0,
  points_redeemed integer not null default 0,
  points_discount integer not null default 0,
  delivery_fee integer not null default 0,
  cod_fee integer not null default 0,
  tax integer not null default 0,
  total integer not null,
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  payment_attempts smallint not null default 0,
  delivery_slot delivery_slot not null default 'standard',
  estimated_delivery date,
  courier text,
  awb text,
  points_awarded boolean not null default false,
  placed_at timestamptz not null default now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx on orders(user_id, placed_at desc);
create index orders_status_idx on orders(status);
create trigger orders_updated before update on orders for each row execute function set_updated_at();

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  variant_id uuid references variants(id) on delete set null,
  product_slug text not null,
  name text not null,
  brand_name text not null,
  variant_name text not null,
  image text,
  qty integer not null,
  unit_price integer not null,
  mrp integer not null,
  line_total integer not null,
  category_root text not null default 'beauty',
  return_window_days smallint not null default 30,
  non_returnable boolean not null default false,
  returned_qty integer not null default 0
);
create index order_items_order_idx on order_items(order_id);
create index order_items_product_idx on order_items(product_id);

create table order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status order_status not null,
  note text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on order_events(order_id, created_at);

create table payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  provider text not null default 'simulated',
  provider_ref text,
  amount integer not null,
  status payment_state not null default 'initiated',
  attempt smallint not null default 1,
  created_at timestamptz not null default now()
);
create index payments_order_idx on payments(order_id);

create table coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references coupons(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index coupon_redemptions_user_idx on coupon_redemptions(coupon_id, user_id);

-- ---------------------------------------------------------------------------
-- Returns
-- ---------------------------------------------------------------------------
create table returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  reason text not null,
  comment text,
  refund_method refund_method not null default 'original',
  photos text[] not null default '{}',
  status return_status not null default 'requested',
  awb text,
  refund_amount integer not null default 0,
  pickup_address jsonb not null,
  pickup_scheduled_for timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index returns_order_idx on returns(order_id);
create index returns_user_idx on returns(user_id);
create trigger returns_updated before update on returns for each row execute function set_updated_at();

create table return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns(id) on delete cascade,
  order_item_id uuid not null references order_items(id) on delete cascade,
  qty integer not null default 1
);

create table return_events (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references returns(id) on delete cascade,
  status return_status not null,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Reviews & Q&A
-- ---------------------------------------------------------------------------
create table reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  order_item_id uuid unique references order_items(id) on delete set null,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null,
  photos text[] not null default '{}',
  skin_type text,
  concerns text[] not null default '{}',
  helpful_count integer not null default 0,
  status review_status not null default 'approved',
  brand_response text,
  brand_responded_at timestamptz,
  points_awarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reviews_product_idx on reviews(product_id, created_at desc);
create index reviews_user_idx on reviews(user_id);
create trigger reviews_updated before update on reviews for each row execute function set_updated_at();

create table review_votes (
  review_id uuid not null references reviews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  body text not null,
  reported boolean not null default false,
  created_at timestamptz not null default now()
);
create index questions_product_idx on questions(product_id, created_at desc);

create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  brand_id uuid references brands(id) on delete set null,
  body text not null,
  reported boolean not null default false,
  created_at timestamptz not null default now()
);
create index answers_question_idx on answers(question_id, created_at);

-- ---------------------------------------------------------------------------
-- Loyalty, notifications, support, analytics
-- ---------------------------------------------------------------------------
create table points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  delta integer not null,
  balance_after integer not null,
  reason text not null,
  ref_type text,
  ref_id uuid,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index points_ledger_user_idx on points_ledger(user_id, created_at desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

create table outbox (
  id uuid primary key default gen_random_uuid(),
  channel outbox_channel not null,
  recipient text not null,
  subject text,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  subject text not null,
  body text not null,
  kind text not null default 'ticket',       -- ticket | callback
  status ticket_status not null default 'open',
  created_at timestamptz not null default now()
);

create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  session_id text,
  name text not null,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on analytics_events(name, created_at desc);

-- ---------------------------------------------------------------------------
-- New user bootstrap: profile, wishlist, notification prefs
-- ---------------------------------------------------------------------------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, name, marketing_consent, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'marketing_consent')::boolean, false),
    new.phone
  )
  on conflict (id) do nothing;
  insert into wishlist_collections (user_id, name, is_default) values (new.id, 'My Wishlist', true);
  insert into notification_prefs (user_id) values (new.id) on conflict do nothing;
  insert into notifications (user_id, type, title, body, href)
  values (new.id, 'welcome', 'Welcome to GLAM ✨', 'Complete your beauty profile to unlock 15% off your first order.', '/profile/beauty');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
