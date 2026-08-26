-- Bar Martiri — run this once in the Supabase SQL editor.
--
-- Safe to run more than once: every statement is guarded, and the price seed
-- only fills a NULL, so it never overwrites a value set from /admin.
--
-- Two things are broken on the live database and this fixes both:
--
--   1. The chat has no way to say "Bar Martiri is typing" — the column and the
--      function it reads do not exist yet.
--   2. The sunbed price has NEVER rendered on the site. setup.sql creates
--      site_settings with "create table if not exists", which silently skips a
--      table that already exists, so this database never received sunbed_price
--      or sunbed_currency. PostgREST answers:
--        {"code":"42703","message":"column site_settings.sunbed_price does not exist"}
--      which fails both the build-time injection and the runtime fetch, and the
--      price slot stays hidden.

-- ---------------------------------------------------------------------------
-- 1. "Bar Martiri is typing"
-- ---------------------------------------------------------------------------

-- A timestamp rather than a boolean: a browser closed mid-sentence never gets
-- to write "false", and a stuck true would leave the dots running for ever.
-- Freshness is decided at read time instead.
alter table public.chat_conversations
  add column if not exists admin_typing_at timestamptz;

-- The admin writes the column directly through the existing "Admins can update
-- conversations" policy. The customer needs this function because anon has no
-- select on chat_conversations at all.
create or replace function public.get_chat_typing(p_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(admin_typing_at > now() - interval '8 seconds', false)
  from public.chat_conversations
  where id = p_id;
$$;

revoke all on function public.get_chat_typing(uuid) from public;
grant execute on function public.get_chat_typing(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. The sunbed price
-- ---------------------------------------------------------------------------

alter table public.site_settings add column if not exists sunbed_price integer;
alter table public.site_settings
  add column if not exists sunbed_currency text not null default 'ALL';

-- The row should already exist, but a database missing the columns may also be
-- missing the row.
insert into public.site_settings (id) values ('main') on conflict (id) do nothing;

-- Seeds the published rate without overwriting one set later from /admin, which
-- stays the source of truth.
update public.site_settings
set sunbed_price = 700
where id = 'main' and sunbed_price is null;

-- ---------------------------------------------------------------------------
-- Check it worked. Expect one row: sunbed_price 700, sunbed_currency ALL.
-- ---------------------------------------------------------------------------

select id, sunbed_price, sunbed_currency from public.site_settings where id = 'main';
