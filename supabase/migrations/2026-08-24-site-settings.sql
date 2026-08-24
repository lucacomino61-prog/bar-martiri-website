-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- It is the same block that now lives in supabase/setup.sql, extracted so an
-- existing database can be brought up to date without re-running the whole
-- setup script. Safe to run more than once.
--
-- Until this runs, the site falls back to 700 ALL and /admin shows an error on
-- the Çmimet tab.

create table if not exists public.site_settings (
  id text primary key default 'main',
  sunbed_price integer not null default 700,
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

-- Sanity check: should return one row, 700 / ALL.
-- select * from public.site_settings;
