-- Transactional business functions. Called from server code over RPC with the service role.

-- ---------------------------------------------------------------------------
-- Loyalty
-- ---------------------------------------------------------------------------
create or replace function user_spend_12m(p_user uuid) returns integer
language sql stable as $$
  select coalesce(sum(subtotal - item_discount - coupon_discount - points_discount), 0)::integer
  from orders
  where user_id = p_user
    and status not in ('cancelled', 'refunded', 'returned')
    and payment_status in ('paid', 'cod_pending')
    and placed_at > now() - interval '12 months';
$$;

create or replace function user_tier(p_user uuid) returns text
language plpgsql stable as $$
declare
  spend integer := user_spend_12m(p_user);
begin
  if spend >= 7500000 then return 'platinum';
  elsif spend >= 3000000 then return 'gold';
  elsif spend >= 1000000 then return 'silver';
  else return 'base';
  end if;
end $$;

create or replace function tier_multiplier(p_tier text) returns numeric
language sql immutable as $$
  select case p_tier when 'platinum' then 3 when 'gold' then 2 when 'silver' then 1.5 else 1 end;
$$;

create or replace function award_points(
  p_user uuid, p_delta integer, p_reason text,
  p_ref_type text default null, p_ref_id uuid default null, p_expires timestamptz default null
) returns integer
language plpgsql security definer set search_path = public as $$
declare
  new_balance integer;
begin
  if p_user is null or p_delta = 0 then
    return null;
  end if;
  update profiles
    set points_balance = greatest(0, points_balance + p_delta)
    where id = p_user
    returning points_balance into new_balance;
  if new_balance is null then
    raise exception 'USER_NOT_FOUND';
  end if;
  insert into points_ledger (user_id, delta, balance_after, reason, ref_type, ref_id, expires_at)
  values (p_user, p_delta, new_balance, p_reason, p_ref_type, p_ref_id,
          case when p_delta > 0 then coalesce(p_expires, now() + interval '12 months') else null end);
  return new_balance;
end $$;

-- ---------------------------------------------------------------------------
-- Notifications helper
-- ---------------------------------------------------------------------------
create or replace function notify_user(
  p_user uuid, p_type notification_type, p_title text, p_body text, p_href text,
  p_channels outbox_channel[] default array['push']::outbox_channel[]
) returns void
language plpgsql security definer set search_path = public as $$
declare
  ch outbox_channel;
  recipient text;
begin
  if p_user is null then return; end if;
  insert into notifications (user_id, type, title, body, href) values (p_user, p_type, p_title, p_body, p_href);
  select coalesce(email, phone, p_user::text) into recipient from profiles where id = p_user;
  foreach ch in array p_channels loop
    insert into outbox (channel, recipient, subject, body, payload)
    values (ch, recipient, p_title, p_body, jsonb_build_object('type', p_type, 'href', p_href, 'user_id', p_user));
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Ratings
-- ---------------------------------------------------------------------------
create or replace function recompute_product_rating(p_product uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r_sum integer;
  r_count integer;
begin
  select coalesce(sum(rating), 0), count(*) into r_sum, r_count
    from reviews where product_id = p_product and status = 'approved';
  update products p set
    rating_count = p.base_rating_count + r_count,
    rating_avg = case when p.base_rating_count + r_count = 0 then 0
                      else round((p.base_rating_sum + r_sum)::numeric / (p.base_rating_count + r_count), 2) end
  where p.id = p_product;
end $$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create or replace function next_order_number() returns text
language sql volatile as $$
  select 'GLM-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYYMMDD') || '-' || lpad((nextval('order_number_seq') % 10000)::text, 4, '0');
$$;

create or replace function order_status_allowed(p_from order_status, p_to order_status) returns boolean
language sql immutable as $$
  select case p_from
    when 'placed' then p_to in ('processing', 'cancelled')
    when 'processing' then p_to in ('shipped', 'cancelled')
    when 'shipped' then p_to in ('out_for_delivery', 'failed_delivery', 'cancelled')
    when 'out_for_delivery' then p_to in ('delivered', 'failed_delivery')
    when 'failed_delivery' then p_to in ('out_for_delivery', 'cancelled')
    when 'delivered' then p_to in ('return_initiated')
    when 'return_initiated' then p_to in ('returned', 'delivered')
    when 'returned' then p_to in ('refunded')
    else false
  end;
$$;

-- Places an order atomically. Payload shape documented in docs/superpowers/plans/2026-10-02-glam-web.md (Task 2).
create or replace function place_order(p_user uuid, p_session text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text := next_order_number();
  v_item jsonb;
  v_variant record;
  v_pricing jsonb := p_payload -> 'pricing';
  v_method payment_method := (p_payload ->> 'payment_method')::payment_method;
  v_total integer := (v_pricing ->> 'total')::integer;
  v_points integer := coalesce((v_pricing ->> 'points_redeemed')::integer, 0);
  v_coupon text := nullif(v_pricing ->> 'coupon_code', '');
  v_coupon_id uuid;
  v_cart_item_ids uuid[];
  v_cat_root text;
  v_window smallint;
begin
  if jsonb_array_length(coalesce(p_payload -> 'items', '[]'::jsonb)) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;
  if v_method = 'cod' and v_total > 2000000 then
    raise exception 'COD_LIMIT';
  end if;

  insert into orders (
    id, order_number, user_id, session_id, guest_email, status, address,
    subtotal, item_discount, coupon_code, coupon_discount, points_redeemed, points_discount,
    delivery_fee, cod_fee, tax, total, payment_method, payment_status, delivery_slot, estimated_delivery
  ) values (
    v_order_id, v_order_number, p_user, p_session, p_payload ->> 'guest_email', 'placed', p_payload -> 'address',
    (v_pricing ->> 'subtotal')::integer,
    coalesce((v_pricing ->> 'item_discount')::integer, 0),
    v_coupon,
    coalesce((v_pricing ->> 'coupon_discount')::integer, 0),
    v_points,
    coalesce((v_pricing ->> 'points_discount')::integer, 0),
    coalesce((v_pricing ->> 'delivery_fee')::integer, 0),
    coalesce((v_pricing ->> 'cod_fee')::integer, 0),
    coalesce((v_pricing ->> 'tax')::integer, 0),
    v_total,
    v_method,
    'pending',
    coalesce((p_payload ->> 'delivery_slot')::delivery_slot, 'standard'),
    (p_payload ->> 'estimated_delivery')::date
  );

  for v_item in select * from jsonb_array_elements(p_payload -> 'items') loop
    select v.id, v.sku, v.name as variant_name, v.stock, v.product_id,
           p.slug, p.name, p.images, p.non_returnable, p.category_id, b.name as brand_name
      into v_variant
      from variants v
      join products p on p.id = v.product_id
      join brands b on b.id = p.brand_id
      where v.id = (v_item ->> 'variant_id')::uuid
      for update of v;
    if v_variant.id is null then
      raise exception 'VARIANT_NOT_FOUND:%', v_item ->> 'variant_id';
    end if;
    if v_variant.stock < (v_item ->> 'qty')::integer then
      raise exception 'OUT_OF_STOCK:%', v_variant.sku;
    end if;
    update variants set stock = stock - (v_item ->> 'qty')::integer where id = v_variant.id;

    select c.root, c.return_window_days into v_cat_root, v_window
      from categories c where c.id = v_variant.category_id;

    insert into order_items (
      order_id, product_id, variant_id, product_slug, name, brand_name, variant_name, image,
      qty, unit_price, mrp, line_total, category_root, return_window_days, non_returnable
    ) values (
      v_order_id, v_variant.product_id, v_variant.id, v_variant.slug, v_variant.name, v_variant.brand_name,
      v_variant.variant_name, (v_variant.images)[1],
      (v_item ->> 'qty')::integer, (v_item ->> 'unit_price')::integer, (v_item ->> 'mrp')::integer,
      (v_item ->> 'line_total')::integer, coalesce(v_cat_root, 'beauty'), coalesce(v_window, 30), v_variant.non_returnable
    );
  end loop;

  insert into order_events (order_id, status, note) values (v_order_id, 'placed', 'Order placed');

  insert into payments (order_id, method, amount, status, attempt)
  values (v_order_id, v_method, v_total, 'initiated', 1);

  if v_coupon is not null then
    update coupons set used_count = used_count + 1 where code = v_coupon returning id into v_coupon_id;
    if v_coupon_id is not null then
      insert into coupon_redemptions (coupon_id, user_id, order_id) values (v_coupon_id, p_user, v_order_id);
    end if;
  end if;

  if v_points > 0 and p_user is not null then
    perform award_points(p_user, -v_points, 'Redeemed at checkout', 'order', v_order_id);
  end if;

  -- Clear purchased items from the cart (specific items for buy-now, otherwise all active items).
  if p_payload ? 'cart_item_ids' then
    select array_agg(x::uuid) into v_cart_item_ids from jsonb_array_elements_text(p_payload -> 'cart_item_ids') x;
    delete from cart_items where id = any(v_cart_item_ids);
  else
    delete from cart_items ci using carts c
      where ci.cart_id = c.id and ci.saved_for_later = false
        and ((p_user is not null and c.user_id = p_user) or (p_session is not null and c.session_id = p_session));
    update carts set coupon_code = null, use_points = false
      where (p_user is not null and user_id = p_user) or (p_session is not null and session_id = p_session);
  end if;

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number);
end $$;

create or replace function confirm_payment(p_order uuid, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o record;
  referrer uuid;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.payment_status in ('paid', 'cod_pending') then return; end if;

  update payments set status = 'success', provider_ref = p_ref
    where order_id = p_order and status = 'initiated';
  update orders set payment_status = (case when o.payment_method = 'cod' then 'cod_pending' else 'paid' end)::payment_status
    where id = p_order;

  update products p set sold_count = p.sold_count + oi.qty
    from order_items oi where oi.order_id = p_order and oi.product_id = p.id;

  insert into order_events (order_id, status, note)
  values (p_order, 'placed', case when o.payment_method = 'cod' then 'Order confirmed (Cash on Delivery)' else 'Payment received' end);

  perform notify_user(o.user_id, 'order_confirmed', 'Order confirmed 🎉',
    format('Your order %s is confirmed. Estimated delivery %s.', o.order_number, to_char(o.estimated_delivery, 'DD Mon')),
    '/orders/' || p_order, array['push', 'sms', 'email']::outbox_channel[]);

  -- Referral reward: referrer earns 200 points when the referred friend completes a first order ≥ ₹500.
  if o.user_id is not null and o.total >= 50000 then
    select referred_by into referrer from profiles where id = o.user_id and referral_rewarded_at is null and referred_by is not null;
    if referrer is not null then
      perform award_points(referrer, 200, 'Referral reward', 'order', p_order);
      update profiles set referral_rewarded_at = now() where id = o.user_id;
      perform notify_user(referrer, 'referral_reward', 'You earned 200 points!',
        'A friend you referred just placed their first order. Points have been added to your balance.', '/profile/rewards');
    end if;
  end if;
end $$;

create or replace function restore_order_resources(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  o record;
begin
  select * into o from orders where id = p_order;
  update variants v set stock = v.stock + oi.qty
    from order_items oi where oi.order_id = p_order and oi.variant_id = v.id;
  if o.points_redeemed > 0 and o.user_id is not null then
    perform award_points(o.user_id, o.points_redeemed, 'Points restored (order cancelled)', 'order', p_order);
  end if;
  if o.coupon_code is not null then
    update coupons set used_count = greatest(0, used_count - 1) where code = o.coupon_code;
    delete from coupon_redemptions where order_id = p_order;
  end if;
end $$;

create or replace function fail_payment(p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  o record;
  attempts smallint;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.payment_status in ('paid', 'cod_pending') then
    return jsonb_build_object('cancelled', false, 'attempts_left', 0);
  end if;
  attempts := o.payment_attempts + 1;
  update payments set status = 'failed' where order_id = p_order and status = 'initiated';
  update orders set payment_attempts = attempts where id = p_order;
  if attempts >= 3 then
    update orders set status = 'cancelled', payment_status = 'failed', cancelled_at = now(), cancel_reason = 'Payment failed after 3 attempts' where id = p_order;
    insert into order_events (order_id, status, note) values (p_order, 'cancelled', 'Payment failed after 3 attempts');
    perform restore_order_resources(p_order);
    return jsonb_build_object('cancelled', true, 'attempts_left', 0);
  end if;
  insert into payments (order_id, method, amount, status, attempt) values (p_order, o.payment_method, o.total, 'initiated', attempts + 1);
  return jsonb_build_object('cancelled', false, 'attempts_left', 3 - attempts);
end $$;

create or replace function cancel_order(p_order uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o record;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if not order_status_allowed(o.status, 'cancelled') then
    raise exception 'CANCEL_NOT_ALLOWED';
  end if;
  update orders set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason where id = p_order;
  insert into order_events (order_id, status, note) values (p_order, 'cancelled', coalesce(p_reason, 'Cancelled'));
  perform restore_order_resources(p_order);
  if o.payment_status = 'paid' then
    update orders set payment_status = 'refunded' where id = p_order;
    update payments set status = 'refunded' where order_id = p_order and status = 'success';
    update profiles set wallet_balance = wallet_balance + o.total where id = o.user_id;
    perform notify_user(o.user_id, 'refund_processed', 'Refund processed',
      format('₹%s for order %s has been credited to your GLAM wallet.', (o.total / 100)::text, o.order_number), '/orders/' || p_order, array['push', 'email']::outbox_channel[]);
  else
    perform notify_user(o.user_id, 'order_cancelled', 'Order cancelled',
      format('Order %s has been cancelled.', o.order_number), '/orders/' || p_order);
  end if;
end $$;

create or replace function advance_order(p_order uuid, p_status order_status, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  o record;
  eligible integer;
  pts integer;
  tier text;
  prev_tier text;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if not order_status_allowed(o.status, p_status) then
    raise exception 'TRANSITION_NOT_ALLOWED:% -> %', o.status, p_status;
  end if;
  if p_status = 'cancelled' then
    perform cancel_order(p_order, coalesce(p_note, 'Cancelled by GLAM'));
    return;
  end if;

  prev_tier := user_tier(o.user_id);

  update orders set
    status = p_status,
    shipped_at = case when p_status = 'shipped' then now() else shipped_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    courier = coalesce(courier, case when p_status = 'shipped' then 'Delhivery' end),
    awb = coalesce(awb, case when p_status = 'shipped' then 'DL' || lpad((floor(random() * 1e10))::bigint::text, 10, '0') end),
    payment_status = case when p_status = 'delivered' and payment_method = 'cod' then 'paid'::payment_status else payment_status end
  where id = p_order;
  insert into order_events (order_id, status, note) values (p_order, p_status, p_note);

  if p_status = 'shipped' then
    perform notify_user(o.user_id, 'order_shipped', 'Your order is on its way',
      format('Order %s has been shipped.', o.order_number), '/orders/' || p_order, array['push', 'sms']::outbox_channel[]);
  elsif p_status = 'out_for_delivery' then
    perform notify_user(o.user_id, 'out_for_delivery', 'Out for delivery',
      format('Order %s will reach you today.', o.order_number), '/orders/' || p_order, array['push', 'sms']::outbox_channel[]);
  elsif p_status = 'delivered' then
    perform notify_user(o.user_id, 'delivered', 'Delivered ✓',
      format('Order %s was delivered. Enjoy!', o.order_number), '/orders/' || p_order, array['push', 'sms']::outbox_channel[]);
    if not o.points_awarded and o.user_id is not null then
      eligible := greatest(0, o.subtotal - o.item_discount - o.coupon_discount - o.points_discount);
      tier := user_tier(o.user_id);
      pts := floor((eligible / 1000.0) * tier_multiplier(tier));
      if pts > 0 then
        perform award_points(o.user_id, pts, 'Order ' || o.order_number, 'order', p_order);
      end if;
      update orders set points_awarded = true where id = p_order;
      update profiles set lifetime_spend = lifetime_spend + eligible where id = o.user_id;
      if user_tier(o.user_id) <> prev_tier then
        perform notify_user(o.user_id, 'tier_upgrade', 'Tier upgraded!',
          format('You are now a GLAM %s member. Enjoy your new benefits.', initcap(user_tier(o.user_id))), '/profile/rewards', array['push', 'email']::outbox_channel[]);
      end if;
    end if;
    perform notify_user(o.user_id, 'review_prompt', 'How was your order?',
      'Share a review and earn up to 50 points per product.', '/orders/' || p_order);
  elsif p_status = 'failed_delivery' then
    perform notify_user(o.user_id, 'order_shipped', 'Delivery attempted',
      format('We could not deliver order %s. We will try again.', o.order_number), '/orders/' || p_order);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Returns
-- ---------------------------------------------------------------------------
create or replace function create_return(p_order uuid, p_user uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  o record;
  r_id uuid := gen_random_uuid();
  it jsonb;
  oi record;
  amount integer := 0;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if o.user_id is distinct from p_user then raise exception 'FORBIDDEN'; end if;
  if o.status <> 'delivered' then raise exception 'RETURN_NOT_ALLOWED'; end if;

  for it in select * from jsonb_array_elements(p_payload -> 'items') loop
    select * into oi from order_items where id = (it ->> 'order_item_id')::uuid and order_id = p_order;
    if oi.id is null then raise exception 'ITEM_NOT_FOUND'; end if;
    if oi.non_returnable then raise exception 'NON_RETURNABLE:%', oi.name; end if;
    if o.delivered_at + make_interval(days => oi.return_window_days) < now() then
      raise exception 'RETURN_WINDOW_CLOSED:%', oi.name;
    end if;
    if oi.returned_qty + (it ->> 'qty')::integer > oi.qty then raise exception 'QTY_EXCEEDS'; end if;
    amount := amount + oi.unit_price * (it ->> 'qty')::integer;
  end loop;

  insert into returns (id, order_id, user_id, reason, comment, refund_method, photos, status, refund_amount, pickup_address, pickup_scheduled_for, awb)
  values (r_id, p_order, p_user, p_payload ->> 'reason', p_payload ->> 'comment',
          coalesce((p_payload ->> 'refund_method')::refund_method, 'original'),
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'photos', '[]'::jsonb)) x), '{}'),
          'requested', least(amount, o.total), coalesce(p_payload -> 'pickup_address', o.address), now() + interval '1 day',
          'RT' || lpad((floor(random() * 1e10))::bigint::text, 10, '0'));

  for it in select * from jsonb_array_elements(p_payload -> 'items') loop
    insert into return_items (return_id, order_item_id, qty) values (r_id, (it ->> 'order_item_id')::uuid, (it ->> 'qty')::integer);
    update order_items set returned_qty = returned_qty + (it ->> 'qty')::integer where id = (it ->> 'order_item_id')::uuid;
  end loop;

  insert into return_events (return_id, status, note) values (r_id, 'requested', 'Return requested');
  update orders set status = 'return_initiated' where id = p_order;
  insert into order_events (order_id, status, note) values (p_order, 'return_initiated', 'Return requested');
  perform notify_user(p_user, 'return_update', 'Return requested',
    'Free pickup will be scheduled within 24 hours.', '/returns/' || r_id, array['push', 'email']::outbox_channel[]);
  return r_id;
end $$;

create or replace function advance_return(p_return uuid, p_status return_status, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  r record;
  o record;
begin
  select * into r from returns where id = p_return for update;
  if r.id is null then raise exception 'RETURN_NOT_FOUND'; end if;
  select * into o from orders where id = r.order_id;

  update returns set status = p_status, refunded_at = case when p_status = 'refunded' then now() else refunded_at end where id = p_return;
  insert into return_events (return_id, status, note) values (p_return, p_status, p_note);

  if p_status = 'received' then
    update orders set status = 'returned' where id = r.order_id;
    insert into order_events (order_id, status, note) values (r.order_id, 'returned', 'Items received at warehouse');
    update variants v set stock = v.stock + ri.qty from return_items ri join order_items oi on oi.id = ri.order_item_id
      where ri.return_id = p_return and oi.variant_id = v.id;
  elsif p_status = 'refunded' then
    update orders set status = 'refunded' where id = r.order_id;
    insert into order_events (order_id, status, note) values (r.order_id, 'refunded', 'Refund processed');
    if r.refund_method = 'wallet' then
      update profiles set wallet_balance = wallet_balance + r.refund_amount where id = r.user_id;
    end if;
    perform notify_user(r.user_id, 'refund_processed', 'Refund processed',
      case when r.refund_method = 'wallet'
        then format('₹%s has been credited to your GLAM wallet.', (r.refund_amount / 100)::text)
        else format('₹%s will reach your original payment method in 5–7 business days.', (r.refund_amount / 100)::text) end,
      '/returns/' || p_return, array['push', 'email']::outbox_channel[]);
  elsif p_status = 'rejected' then
    update orders set status = 'delivered' where id = r.order_id;
    insert into order_events (order_id, status, note) values (r.order_id, 'delivered', 'Return request rejected');
    update order_items oi set returned_qty = greatest(0, oi.returned_qty - ri.qty) from return_items ri
      where ri.return_id = p_return and ri.order_item_id = oi.id;
    perform notify_user(r.user_id, 'return_update', 'Return update', coalesce(p_note, 'Your return request could not be approved.'), '/returns/' || p_return);
  else
    perform notify_user(r.user_id, 'return_update', 'Return update',
      case p_status when 'pickup_scheduled' then 'Pickup scheduled. Keep the item packed and ready.'
                    when 'picked_up' then 'Your return has been picked up.' else coalesce(p_note, 'Status updated') end,
      '/returns/' || p_return);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create or replace function submit_review(p_user uuid, p_payload jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  oi record;
  o record;
  r_id uuid;
  pts integer;
  has_photo boolean;
begin
  select * into oi from order_items where id = (p_payload ->> 'order_item_id')::uuid;
  if oi.id is null then raise exception 'ITEM_NOT_FOUND'; end if;
  select * into o from orders where id = oi.order_id;
  if o.user_id is distinct from p_user then raise exception 'FORBIDDEN'; end if;
  if o.delivered_at is null or o.status not in ('delivered', 'return_initiated', 'returned', 'refunded') then raise exception 'NOT_DELIVERED'; end if;
  if now() < o.delivered_at + interval '24 hours' then raise exception 'REVIEW_TOO_EARLY'; end if;
  if now() > o.delivered_at + interval '90 days' then raise exception 'REVIEW_WINDOW_CLOSED'; end if;
  if exists (select 1 from reviews where order_item_id = oi.id) then raise exception 'ALREADY_REVIEWED'; end if;
  if length(trim(p_payload ->> 'body')) < 30 then raise exception 'BODY_TOO_SHORT'; end if;

  has_photo := jsonb_array_length(coalesce(p_payload -> 'photos', '[]'::jsonb)) > 0;
  insert into reviews (product_id, user_id, order_item_id, rating, title, body, photos, skin_type, concerns, status, points_awarded)
  values (oi.product_id, p_user, oi.id, (p_payload ->> 'rating')::smallint, p_payload ->> 'title', p_payload ->> 'body',
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'photos', '[]'::jsonb)) x), '{}'),
          p_payload ->> 'skin_type',
          coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p_payload -> 'concerns', '[]'::jsonb)) x), '{}'),
          'approved', true)
  returning id into r_id;
  perform recompute_product_rating(oi.product_id);
  pts := case when has_photo then 50 else 20 end;
  perform award_points(p_user, pts, 'Review bonus', 'review', r_id);
  return r_id;
end $$;

-- ---------------------------------------------------------------------------
-- Welcome coupon on beauty profile completion
-- ---------------------------------------------------------------------------
create or replace function grant_welcome_coupon(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  code text;
begin
  select c.code into code from coupons c where c.user_id = p_user and c.description = 'Welcome offer';
  if code is not null then return code; end if;
  code := 'WELCOME15-' || (select substr(referral_code, 5) from profiles where id = p_user);
  insert into coupons (code, kind, value, max_discount, min_order, user_id, ends_at, usage_limit, per_user_limit, description)
  values (code, 'percent', 15, 30000, 0, p_user, now() + interval '30 days', 1, 1, 'Welcome offer');
  perform notify_user(p_user, 'coupon', 'Your welcome gift 🎁',
    format('Use code %s for 15%% off your first order (max ₹300).', code), '/bag');
  return code;
end $$;

-- ---------------------------------------------------------------------------
-- GLAM Pro subscription
-- ---------------------------------------------------------------------------
create or replace function activate_pro(p_user uuid, p_months integer default 1) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  until_ts timestamptz;
begin
  update profiles
    set pro_until = greatest(coalesce(pro_until, now()), now()) + make_interval(months => p_months)
    where id = p_user
    returning pro_until into until_ts;
  perform notify_user(p_user, 'welcome', 'Welcome to GLAM Pro ✨',
    'Free delivery, early sale access and bonus rewards are now active.', '/pro', array['push', 'email']::outbox_channel[]);
  return until_ts;
end $$;
