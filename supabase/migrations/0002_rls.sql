-- Row Level Security. The app performs privileged writes through the service role
-- (server-only). These policies define what the anon/authenticated roles can do directly.

alter table profiles enable row level security;
alter table beauty_profiles enable row level security;
alter table notification_prefs enable row level security;
alter table addresses enable row level security;
alter table pincodes enable row level security;
alter table saved_payment_methods enable row level security;
alter table brands enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table variants enable row level security;
alter table brand_follows enable row level security;
alter table stock_alerts enable row level security;
alter table recently_viewed enable row level security;
alter table search_history enable row level security;
alter table banners enable row level security;
alter table editorial_cards enable row level security;
alter table flash_sales enable row level security;
alter table flash_sale_items enable row level security;
alter table coupons enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;
alter table wishlist_collections enable row level security;
alter table wishlist_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_events enable row level security;
alter table payments enable row level security;
alter table coupon_redemptions enable row level security;
alter table returns enable row level security;
alter table return_items enable row level security;
alter table return_events enable row level security;
alter table reviews enable row level security;
alter table review_votes enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table points_ledger enable row level security;
alter table notifications enable row level security;
alter table outbox enable row level security;
alter table support_tickets enable row level security;
alter table analytics_events enable row level security;

-- Public catalogue & merchandising -------------------------------------------
create policy "public read brands" on brands for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read products" on products for select using (is_active);
create policy "public read variants" on variants for select using (true);
create policy "public read pincodes" on pincodes for select using (true);
create policy "public read banners" on banners for select using (is_active);
create policy "public read editorial" on editorial_cards for select using (is_active);
create policy "public read flash sales" on flash_sales for select using (is_active);
create policy "public read flash sale items" on flash_sale_items for select using (true);
create policy "public read approved reviews" on reviews for select using (status = 'approved');
create policy "public read questions" on questions for select using (true);
create policy "public read answers" on answers for select using (true);
create policy "read public coupons" on coupons for select
  using (is_active and (user_id is null or user_id = auth.uid()));

-- Own rows ---------------------------------------------------------------------
create policy "own profile read" on profiles for select using (id = auth.uid());
create policy "own beauty profile" on beauty_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notification prefs" on notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own payment methods" on saved_payment_methods for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own brand follows" on brand_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own stock alerts" on stock_alerts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own recently viewed" on recently_viewed for select using (user_id = auth.uid());
create policy "own search history" on search_history for select using (user_id = auth.uid());
create policy "own cart" on carts for select using (user_id = auth.uid());
create policy "own cart items" on cart_items for select
  using (exists (select 1 from carts c where c.id = cart_items.cart_id and c.user_id = auth.uid()));
create policy "own wishlist collections" on wishlist_collections for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist items" on wishlist_items for all
  using (exists (select 1 from wishlist_collections w where w.id = wishlist_items.collection_id and w.user_id = auth.uid()))
  with check (exists (select 1 from wishlist_collections w where w.id = wishlist_items.collection_id and w.user_id = auth.uid()));
create policy "own orders" on orders for select using (user_id = auth.uid());
create policy "own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_items.order_id and o.user_id = auth.uid()));
create policy "own order events" on order_events for select
  using (exists (select 1 from orders o where o.id = order_events.order_id and o.user_id = auth.uid()));
create policy "own payments" on payments for select
  using (exists (select 1 from orders o where o.id = payments.order_id and o.user_id = auth.uid()));
create policy "own returns" on returns for select using (user_id = auth.uid());
create policy "own return items" on return_items for select
  using (exists (select 1 from returns r where r.id = return_items.return_id and r.user_id = auth.uid()));
create policy "own return events" on return_events for select
  using (exists (select 1 from returns r where r.id = return_events.return_id and r.user_id = auth.uid()));
create policy "own reviews read" on reviews for select using (user_id = auth.uid());
create policy "own review votes" on review_votes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ask questions" on questions for insert with check (user_id = auth.uid());
create policy "answer questions" on answers for insert with check (user_id = auth.uid());
create policy "own points" on points_ledger for select using (user_id = auth.uid());
create policy "own notifications read" on notifications for select using (user_id = auth.uid());
create policy "own notifications mark read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own tickets" on support_tickets for select using (user_id = auth.uid());
create policy "insert tickets" on support_tickets for insert with check (user_id = auth.uid());
create policy "insert analytics" on analytics_events for insert with check (true);
-- outbox, coupon_redemptions: service role only (no policies).
