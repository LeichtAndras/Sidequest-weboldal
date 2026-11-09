-- =====================================================================
-- SideQuest partnerek es rovid kod. Futtasd a Supabase SQL Editorban,
-- egyben, a supabase/fiok.sql UTAN. Utana a supabase/partnerek.sql jon.
-- Tobbszor is lefuttathato.
--
-- A beváltás szabalyai mar nem itt vannak: az ajanlatok es az igenylesek
-- a supabase/ajanlatok.sql-ben, az alap kedvezmeny bevaltasa a
-- supabase/alap.sql-ben. A regi redemptions tabla es a bevaltas_inditasa
-- fuggveny megszunt (alap.sql dobja el).
-- Csak az anon kulcs kell, a service_role kulcs nem.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Partnerek. Csak a fuggvenyek olvassak, kozvetlenul senki.
--    A tartalmat a supabase/partnerek.sql tolti fel (npm run partnerek-sql).
--    A kedvezmenyek az offers tablaban vannak (supabase/ajanlatok.sql).
-- ---------------------------------------------------------------------
create table if not exists public.partners (
  slug text primary key,
  name text not null,
  mode text not null check (mode in ('helyszini', 'online_kod')),
  -- 1 = hetfo ... 7 = vasarnap. Null: minden nap.
  allowed_days integer[],
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.partners enable row level security;
revoke all on public.partners from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Rovid azonosito a pénztárosnak, pl. "K7QM". Osszetevesztheto betuk
--    (O es 0, I es 1) nincsenek benne.
-- ---------------------------------------------------------------------
create or replace function public.rovid_kod()
returns text
language sql
volatile
set search_path = public
as $$
  select string_agg(substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 4)
$$;

revoke execute on function public.rovid_kod() from public, anon, authenticated;
