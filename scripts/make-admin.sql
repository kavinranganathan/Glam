-- Promote a user to admin so they can open /admin.
--
-- Usage (psql, with the pooler/connection string from the Supabase dashboard):
--   psql "$DATABASE_URL" -v email='you@example.com' -f scripts/make-admin.sql
--
-- Or paste into the Supabase SQL editor, replacing :'email' with a quoted address:
--   update profiles set role = 'admin' where email = 'you@example.com';
--
-- The user must have signed in at least once (the profile row is created on signup).
update profiles set role = 'admin' where email = :'email';
