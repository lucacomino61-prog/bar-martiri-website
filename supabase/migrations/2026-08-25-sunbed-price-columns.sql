-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to run more than once.
--
-- Why this exists: public.site_settings was already in the database before the
-- sunbed price was built. It holds the opening hours, phone, address and
-- Instagram handle, and nothing in this repo reads or writes those columns.
-- 2026-08-24-site-settings.sql opens with `create table if not exists`, which is
-- a no-op against a table that already exists, so the two sunbed columns were
-- never added and every page load gets a 400 (42703, undefined_column).
--
-- This adds only the missing columns. It deliberately does not touch the table's
-- policies: public read already works, and the write policies belong to whatever
-- owns the contact columns.

alter table public.site_settings add column if not exists sunbed_price integer;
alter table public.site_settings add column if not exists sunbed_currency text not null default 'ALL';

-- Sanity check: one row, sunbed_price null, sunbed_currency 'ALL', and the
-- contact columns untouched.
--   select * from public.site_settings;
--
-- If /admin then fails to save with a missing column "in the schema cache",
-- PostgREST has not reloaded yet:
--   notify pgrst, 'reload schema';
