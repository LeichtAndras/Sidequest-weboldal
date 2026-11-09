-- =====================================================================
-- SideQuest udvozlo ajandek. Futtasd a Supabase SQL Editorban, egyben,
-- a supabase/kodok.sql UTAN. Tobbszor is lefuttathato.
--
-- Meglevo adatbazisnal a sorrend: ez a fajl, utana bevaltas.sql, kodok.sql
-- es partnerek.sql (a ket fuggveny ott van, es mar erre a tablara epit).
--
-- Szabalyok, mind itt kikenyszeritve:
--   - minden user osszesen EGY udvozlo ajandekot kap, amit egy listabol
--     valaszt; az ajanlatoknak korlatozott a darabszama
--   - egyszerre egy aktiv valasztasa lehet; ha mar bevaltotta, tobbet nem
--     valaszthat (egyedi index)
--   - a valasztastol 14 napja van bevaltani; ha nem valtja be, a valasztas
--     lejar, a darab visszakerul, es ujra valaszthat
--   - szabad darab = osszes - aktiv (nem lejart, nem bevaltott) - bevaltott
--   - az utolso darabot ket ember nem kaphatja meg: a valasztas
--     partnerenkent zarolva fut
--   - online partnernel (kodos) annyi darab valaszthato, ahany szabad
--     udvozlo kod van a kodbankban, levonva a mar lefoglaltakat
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. A regi, partnerenkenti udvozlo kedvezmeny kivezetese
-- ---------------------------------------------------------------------
drop index if exists public.redemptions_egy_udvozlo;
alter table public.partners drop column if exists welcome_pct;

-- ---------------------------------------------------------------------
-- 1. Ajanlatok. Ez az egyetlen hely, ahol at kell irni oket: Supabase ->
--    Table Editor -> welcome_offers. Deploy nem kell hozza.
-- ---------------------------------------------------------------------
create table if not exists public.welcome_offers (
  id bigint generated always as identity primary key,
  partner_slug text not null references public.partners (slug),
  pct integer not null check (pct between 1 and 100),
  total integer not null check (total >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.welcome_offers enable row level security;
revoke all on public.welcome_offers from anon, authenticated;

-- Kezdo helykitoltok, csak ha meg ures a tabla
insert into public.welcome_offers (partner_slug, pct, total)
select v.partner_slug, v.pct, v.total
from (values
  ('sugar-bowling', 40, 5),
  ('timeheist', 40, 5),
  ('rage-room-budapest', 40, 5)
) as v (partner_slug, pct, total)
where not exists (select 1 from public.welcome_offers);

-- ---------------------------------------------------------------------
-- 2. Valasztasok
-- ---------------------------------------------------------------------
create table if not exists public.welcome_claims (
  id uuid primary key default gen_random_uuid(),
  -- Fioktorleskor a sor megmarad nev nelkul: a bevaltott darab igy nem
  -- kerul vissza, az aktiv viszont felszabadul
  user_id uuid references auth.users (id) on delete set null,
  offer_id bigint not null references public.welcome_offers (id),
  claimed_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz
);

-- Bevaltott ajandek userenkent legfeljebb egy
create unique index if not exists welcome_claims_egy_bevaltott
  on public.welcome_claims (user_id)
  where redeemed_at is not null;

create index if not exists welcome_claims_user_idx on public.welcome_claims (user_id, claimed_at desc);
create index if not exists welcome_claims_offer_idx on public.welcome_claims (offer_id);

alter table public.welcome_claims enable row level security;
revoke all on public.welcome_claims from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Szabad darab egy ajanlatbol. Belso, kivulrol nem hivhato.
-- ---------------------------------------------------------------------
create or replace function public.ajanlat_szabad(p_ajanlat bigint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  with o as (
    select w.id, w.partner_slug, w.total, p.mode
    from public.welcome_offers w
    join public.partners p on p.slug = w.partner_slug
    where w.id = p_ajanlat
  ),
  foglalt as (
    select
      count(*) filter (where c.redeemed_at is not null) as bevaltott,
      count(*) filter (
        where c.redeemed_at is null and c.user_id is not null and c.expires_at > now()
      ) as aktiv
    from public.welcome_claims c
    where c.offer_id = p_ajanlat
  ),
  kodok as (
    -- Online partnernel: szabad udvozlo kodok, minusz a partner aktiv,
    -- meg kod nelkuli foglalasai (barmelyik ajanlatabol)
    select
      (select count(*) from public.code_pool k
        where k.partner_slug = o.partner_slug and k.tipus = 'welcome' and k.assigned_at is null
          and (k.valid_until is null or k.valid_until >= (now() at time zone 'Europe/Budapest')::date))
      -
      (select count(*) from public.welcome_claims c
        join public.welcome_offers w on w.id = c.offer_id
        where w.partner_slug = o.partner_slug
          and c.redeemed_at is null and c.user_id is not null and c.expires_at > now())
      as maradek
    from o
  )
  select greatest(
    0,
    case when o.mode = 'online_kod'
      then least(o.total - f.bevaltott - f.aktiv, k.maradek)
      else o.total - f.bevaltott - f.aktiv
    end
  )::integer
  from o, foglalt f, kodok k
$$;

-- ---------------------------------------------------------------------
-- 4. Az ajanlatok listaja. Kijelentkezve is hivhato (popup, kartyak):
--    csak partnert, szazalekot es szabad darabot ad, mast nem.
-- ---------------------------------------------------------------------
create or replace function public.ajandek_lista()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    json_agg(
      json_build_object(
        'id', o.id,
        'partner_slug', o.partner_slug,
        'partner', p.name,
        'pct', o.pct,
        'szabad', public.ajanlat_szabad(o.id),
        'mod', p.mode
      )
      order by o.pct desc, p.name
    ),
    '[]'::json
  )
  from public.welcome_offers o
  join public.partners p on p.slug = o.partner_slug
  where o.active and p.active
$$;

-- ---------------------------------------------------------------------
-- 5. A sajat ajandek allapota: nincs / aktiv / bevaltott / lejart
-- ---------------------------------------------------------------------
create or replace function public.ajandekom()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v record;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  select c.claimed_at, c.expires_at, c.redeemed_at, o.partner_slug, o.pct, p.name
  into v
  from public.welcome_claims c
  join public.welcome_offers o on o.id = c.offer_id
  join public.partners p on p.slug = o.partner_slug
  where c.user_id = v_uid
  order by (c.redeemed_at is not null) desc, c.claimed_at desc
  limit 1;

  if not found then
    return json_build_object('statusz', 'nincs');
  end if;

  return json_build_object(
    'statusz', case
      when v.redeemed_at is not null then 'bevaltott'
      when v.expires_at > now() then 'aktiv'
      else 'lejart'
    end,
    'partner_slug', v.partner_slug,
    'partner', v.name,
    'pct', v.pct,
    'valasztva', v.claimed_at,
    'lejarat', v.expires_at,
    'bevaltva', v.redeemed_at
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Ajandek valasztasa
-- ---------------------------------------------------------------------
create or replace function public.ajandek_valasztasa(p_ajanlat bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_o record;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  if not exists (select 1 from public.profiles where id = v_uid) then
    return json_build_object('statusz', 'nincs_profil');
  end if;

  -- Egy user egyszerre csak egy valasztast futtathat
  perform pg_advisory_xact_lock(hashtext('ajandek|' || v_uid::text));

  if exists (select 1 from public.welcome_claims where user_id = v_uid and redeemed_at is not null) then
    return json_build_object('statusz', 'mar_bevaltotta');
  end if;

  if exists (
    select 1 from public.welcome_claims
    where user_id = v_uid and redeemed_at is null and expires_at > now()
  ) then
    return json_build_object('statusz', 'mar_valasztott');
  end if;

  select o.id, o.partner_slug
  into v_o
  from public.welcome_offers o
  join public.partners p on p.slug = o.partner_slug
  where o.id = p_ajanlat and o.active and p.active;

  if not found then
    return json_build_object('statusz', 'nincs_ajanlat');
  end if;

  -- Partnerenkent egyszerre egy valasztas: igy az utolso darabot (es
  -- online partnernel az utolso udvozlo kodot) csak egy ember kapja meg
  perform pg_advisory_xact_lock(hashtext('ajanlat|' || v_o.partner_slug));

  if public.ajanlat_szabad(v_o.id) < 1 then
    return json_build_object('statusz', 'elfogyott');
  end if;

  insert into public.welcome_claims (user_id, offer_id, expires_at)
  values (v_uid, v_o.id, now() + interval '14 days');

  return json_build_object('statusz', 'ok', 'ajandek', public.ajandekom());
end;
$$;

revoke execute on function public.ajanlat_szabad(bigint) from public, anon, authenticated;
revoke execute on function public.ajandek_lista() from public;
grant execute on function public.ajandek_lista() to anon, authenticated;
revoke execute on function public.ajandekom() from public, anon;
grant execute on function public.ajandekom() to authenticated;
revoke execute on function public.ajandek_valasztasa(bigint) from public, anon;
grant execute on function public.ajandek_valasztasa(bigint) to authenticated;
