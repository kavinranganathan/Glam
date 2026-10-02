-- Smoke tests for migrations + seed, run by scripts/db-validate.sh on a local throwaway cluster.
\set ON_ERROR_STOP on

do $$
declare
  n int;
begin
  select count(*) into n from products; if n < 150 then raise exception 'expected >=150 products, got %', n; end if;
  select count(*) into n from variants; if n < 300 then raise exception 'expected >=300 variants, got %', n; end if;
  select count(*) into n from brands; if n < 25 then raise exception 'expected >=25 brands, got %', n; end if;
  select count(*) into n from categories where parent_id is not null; if n < 20 then raise exception 'expected >=20 subcategories, got %', n; end if;
  select count(*) into n from pincodes; if n < 30 then raise exception 'expected >=30 pincodes, got %', n; end if;
  select count(*) into n from flash_sale_items; if n <> 12 then raise exception 'expected 12 flash sale items, got %', n; end if;
  select count(*) into n from products where search @@ websearch_to_tsquery('english', 'vitamin c serum');
  if n < 1 then raise exception 'full text search returned nothing'; end if;
end $$;

-- New user bootstrap via auth trigger
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000001', 'priya@example.com', '{"name":"Priya Sharma","marketing_consent":true}');
insert into auth.users (id, email, raw_user_meta_data) values ('00000000-0000-0000-0000-000000000002', 'rohan@example.com', '{"name":"Rohan"}');
do $$
declare p record; n int;
begin
  select * into p from profiles where id = '00000000-0000-0000-0000-000000000001';
  if p.id is null then raise exception 'profile not created by trigger'; end if;
  if p.referral_code !~ '^GLAM[A-Z2-9]{6}$' then raise exception 'bad referral code %', p.referral_code; end if;
  if p.name <> 'Priya Sharma' then raise exception 'name not copied'; end if;
  select count(*) into n from wishlist_collections where user_id = p.id and is_default; if n <> 1 then raise exception 'default wishlist missing'; end if;
  select count(*) into n from notifications where user_id = p.id; if n <> 1 then raise exception 'welcome notification missing'; end if;
end $$;

-- Referral link: Rohan referred by Priya
update profiles set referred_by = '00000000-0000-0000-0000-000000000001' where id = '00000000-0000-0000-0000-000000000002';

-- Welcome coupon
do $$
declare c text;
begin
  c := grant_welcome_coupon('00000000-0000-0000-0000-000000000001');
  if c not like 'WELCOME15-%' then raise exception 'bad welcome coupon %', c; end if;
  if grant_welcome_coupon('00000000-0000-0000-0000-000000000001') <> c then raise exception 'welcome coupon not idempotent'; end if;
end $$;

-- Cart for Priya
insert into carts (id, user_id) values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001');
insert into cart_items (cart_id, variant_id, qty)
  select '22222222-2222-2222-2222-222222222222', id, 2 from variants where stock >= 10 order by sku limit 1;

-- Place order (Rohan, so the referral reward can fire), with a ₹600 total
do $$
declare
  v record;
  res jsonb;
  o record;
  stock_before int;
  pts int;
begin
  select * into v from variants where stock >= 10 order by sku limit 1;
  stock_before := v.stock;
  -- give Rohan some points to redeem
  perform award_points('00000000-0000-0000-0000-000000000002', 100, 'Seed');
  res := place_order('00000000-0000-0000-0000-000000000002', null, jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('variant_id', v.id, 'qty', 2, 'unit_price', v.price, 'mrp', v.mrp, 'line_total', v.price * 2)),
    'address', '{"name":"Rohan","phone":"9999999999","line1":"1 Marine Drive","city":"Mumbai","state":"Maharashtra","pincode":"400001"}'::jsonb,
    'pricing', jsonb_build_object('subtotal', v.price * 2, 'item_discount', 0, 'coupon_code', 'GLAM200', 'coupon_discount', 20000,
                                  'points_redeemed', 40, 'points_discount', 1000, 'delivery_fee', 0, 'cod_fee', 0, 'tax', 0,
                                  'total', greatest(50000, v.price * 2 - 21000)),
    'payment_method', 'upi', 'delivery_slot', 'standard', 'estimated_delivery', (current_date + 3)::text
  ));
  if res ->> 'order_number' !~ '^GLM-\d{8}-\d{4}$' then raise exception 'bad order number %', res; end if;
  select * into o from orders where id = (res ->> 'order_id')::uuid;
  if o.status <> 'placed' or o.payment_status <> 'pending' then raise exception 'bad initial order state'; end if;
  if (select stock from variants where id = v.id) <> stock_before - 2 then raise exception 'stock not decremented'; end if;
  if (select used_count from coupons where code = 'GLAM200') <> 1 then raise exception 'coupon usage not counted'; end if;
  select points_balance into pts from profiles where id = '00000000-0000-0000-0000-000000000002';
  if pts <> 60 then raise exception 'points not debited, balance %', pts; end if;
  if (select count(*) from order_items where order_id = o.id) <> 1 then raise exception 'order items missing'; end if;

  -- payment failure x1 then success
  if (fail_payment(o.id) ->> 'attempts_left')::int <> 2 then raise exception 'fail_payment attempts wrong'; end if;
  perform confirm_payment(o.id, 'pay_test_123');
  select * into o from orders where id = o.id;
  if o.payment_status <> 'paid' then raise exception 'payment not confirmed'; end if;
  if (select count(*) from notifications where user_id = o.user_id and type = 'order_confirmed') <> 1 then raise exception 'confirmation notification missing'; end if;
  if (select count(*) from outbox where channel = 'sms') < 1 then raise exception 'sms outbox missing'; end if;
  -- referral reward to Priya
  if (select points_balance from profiles where id = '00000000-0000-0000-0000-000000000001') <> 200 then raise exception 'referral reward not credited'; end if;

  -- fulfilment
  perform advance_order(o.id, 'processing', 'Packed');
  perform advance_order(o.id, 'shipped', null);
  perform advance_order(o.id, 'out_for_delivery', null);
  perform advance_order(o.id, 'delivered', null);
  select * into o from orders where id = o.id;
  if o.status <> 'delivered' or o.delivered_at is null or o.awb is null then raise exception 'fulfilment failed'; end if;
  if not o.points_awarded then raise exception 'points not awarded on delivery'; end if;
  select points_balance into pts from profiles where id = '00000000-0000-0000-0000-000000000002';
  if pts <= 60 then raise exception 'delivery points not credited, balance %', pts; end if;

  -- illegal transition
  begin
    perform advance_order(o.id, 'shipped', null);
    raise exception 'illegal transition allowed';
  exception when others then
    if sqlerrm not like 'TRANSITION_NOT_ALLOWED%' then raise; end if;
  end;

  -- review too early (delivered just now)
  begin
    perform submit_review('00000000-0000-0000-0000-000000000002', jsonb_build_object('order_item_id', (select id from order_items where order_id = o.id limit 1), 'rating', 5, 'body', 'Absolutely love this product, works great on my skin and smells amazing.'));
    raise exception 'review accepted too early';
  exception when others then
    if sqlerrm <> 'REVIEW_TOO_EARLY' then raise; end if;
  end;
  -- pretend delivered 2 days ago, then review
  update orders set delivered_at = now() - interval '2 days' where id = o.id;
  perform submit_review('00000000-0000-0000-0000-000000000002', jsonb_build_object('order_item_id', (select id from order_items where order_id = o.id limit 1), 'rating', 5, 'body', 'Absolutely love this product, works great on my skin and smells amazing.', 'photos', jsonb_build_array('https://example.com/p.jpg')));
  if (select rating_count from products where id = v.product_id) <> (select base_rating_count + 1 from products where id = v.product_id) then raise exception 'rating not recomputed'; end if;
  if (select points_balance from profiles where id = '00000000-0000-0000-0000-000000000002') <> pts + 50 then raise exception 'review points not credited'; end if;

  -- return + refund to wallet
  declare r uuid; begin
    r := create_return(o.id, '00000000-0000-0000-0000-000000000002', jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object('order_item_id', (select id from order_items where order_id = o.id limit 1), 'qty', 1)),
      'reason', 'Damaged', 'refund_method', 'wallet', 'photos', jsonb_build_array('https://example.com/d.jpg')));
    if (select status from orders where id = o.id) <> 'return_initiated' then raise exception 'order not in return_initiated'; end if;
    perform advance_return(r, 'pickup_scheduled', null);
    perform advance_return(r, 'picked_up', null);
    perform advance_return(r, 'received', null);
    if (select stock from variants where id = v.id) <> stock_before - 1 then raise exception 'stock not restored on return'; end if;
    perform advance_return(r, 'refunded', null);
    if (select status from orders where id = o.id) <> 'refunded' then raise exception 'order not refunded'; end if;
    if (select wallet_balance from profiles where id = '00000000-0000-0000-0000-000000000002') <> v.price then raise exception 'wallet not credited'; end if;
  end;
end $$;

-- Out of stock + cancel paths
do $$
declare
  v record; res jsonb; o record;
begin
  select * into v from variants where stock between 1 and 3 order by sku limit 1;
  begin
    perform place_order('00000000-0000-0000-0000-000000000001', null, jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object('variant_id', v.id, 'qty', 5, 'unit_price', v.price, 'mrp', v.mrp, 'line_total', v.price * 5)),
      'address', '{}'::jsonb, 'pricing', jsonb_build_object('subtotal', v.price * 5, 'total', v.price * 5), 'payment_method', 'cod'));
    raise exception 'oversell allowed';
  exception when others then
    if sqlerrm not like 'OUT_OF_STOCK:%' then raise; end if;
  end;
  -- COD limit
  begin
    perform place_order('00000000-0000-0000-0000-000000000001', null, jsonb_build_object(
      'items', jsonb_build_array(jsonb_build_object('variant_id', v.id, 'qty', 1, 'unit_price', v.price, 'mrp', v.mrp, 'line_total', v.price)),
      'address', '{}'::jsonb, 'pricing', jsonb_build_object('subtotal', 2500000, 'total', 2500000), 'payment_method', 'cod'));
    raise exception 'COD limit not enforced';
  exception when others then
    if sqlerrm <> 'COD_LIMIT' then raise; end if;
  end;
  -- guest COD order from the cart session, then cancel
  res := place_order(null, 'guest-session-1', jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('variant_id', v.id, 'qty', 1, 'unit_price', v.price, 'mrp', v.mrp, 'line_total', v.price)),
    'address', '{"name":"Guest"}'::jsonb, 'pricing', jsonb_build_object('subtotal', v.price, 'total', v.price + 4000, 'cod_fee', 4000),
    'payment_method', 'cod', 'guest_email', 'guest@example.com'));
  perform confirm_payment((res ->> 'order_id')::uuid, 'cod');
  select * into o from orders where id = (res ->> 'order_id')::uuid;
  if o.payment_status <> 'cod_pending' then raise exception 'cod status wrong'; end if;
  perform cancel_order(o.id, 'Changed my mind');
  if (select status from orders where id = o.id) <> 'cancelled' then raise exception 'cancel failed'; end if;
  if (select stock from variants where id = v.id) <> v.stock then raise exception 'stock not restored on cancel'; end if;
end $$;

-- Pro activation
do $$
begin
  if activate_pro('00000000-0000-0000-0000-000000000001', 1) < now() + interval '27 days' then raise exception 'pro not activated'; end if;
end $$;

-- RLS sanity: anon can read products but not profiles
set role anon;
select set_config('request.jwt.claim.sub', '', true);
do $$
declare n int;
begin
  select count(*) into n from products; if n = 0 then raise exception 'anon cannot read products'; end if;
  select count(*) into n from profiles; if n <> 0 then raise exception 'anon can read profiles'; end if;
  select count(*) into n from orders; if n <> 0 then raise exception 'anon can read orders'; end if;
end $$;
reset role;

select 'smoke ok' as result;
