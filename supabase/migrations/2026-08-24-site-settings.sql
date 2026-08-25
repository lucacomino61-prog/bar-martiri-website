-- SUPERSEDED by 2026-08-25-sunbed-price-columns.sql. Do not run this file.
--
-- public.site_settings already existed in the live database with a different
-- shape (opening hours, phone, address, Instagram), so the create below is a
-- no-op there and never added the sunbed columns -- which is why the site got a
-- 400 on every load. The policy blocks would also rewrite policies on a table
-- this repo does not own. Kept for the record; it is still correct for a fresh
-- database, where setup.sql is what you would run anyway.
--
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It is the same block that now lives in supabase/setup.sql, extracted so an
-- existing database can be brought up to date without re-running the whole
-- setup script. Safe to run more than once.
--
-- The price starts empty: nothing is shown on the site until one is saved from
-- /admin. Until this migration runs, the Çmimet tab shows an error.

create table if not exists public.site_settings (
  id text primary key default 'main',
  sunbed_price integer,  -- null until a price is published from /admin
  sunbed_currency text not null default 'ALL',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values ('main') on conflict (id) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings for select
to anon, authenticated
using (true);

drop policy if exists "Admins can insert site settings" on public.site_settings;
create policy "Admins can insert site settings"
on public.site_settings for insert
to authenticated
with check (public.is_menu_admin());

drop policy if exists "Admins can update site settings" on public.site_settings;
create policy "Admins can update site settings"
on public.site_settings for update
to authenticated
using (public.is_menu_admin())
with check (public.is_menu_admin());

-- Sanity check: should return one row with a null sunbed_price.
-- select * from public.site_settings;
