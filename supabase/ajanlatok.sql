-- =====================================================================
-- SideQuest ajanlatok, 1. fazis: adatmodell. Futtasd a Supabase SQL
-- Editorban, egyben, a supabase/kodok.sql UTAN. Tobbszor is lefuttathato.
--
-- Harom ajanlattipus, mind limitalt kerettel:
--   alap:    havi keret, minden honap 1-jen ujraindul (budapesti ido)
--   welcome: havi keret partnerenkent, useronkent osszesen egy
--   drop:    egyszeri keret, kezdes es vege kozott igenyelheto
--
-- A keretet nem nullazzuk: a felhasznalast mindig az aktualis budapesti
-- honapra szamoljuk. Ezert nincs idozitett feladat.
--
-- Az ajanlatokat a Supabase Table Editorban, az offers tablaban kezeled.
-- A partners tablat tovabbra is a supabase/partnerek.sql tolti
-- (npm run partnerek-sql), az uj_bevaltas kapcsoloval egyutt.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tesztelo es partnerkapcsolo
-- ---------------------------------------------------------------------
-- Tesztelo: elesites elott is hasznalhatja az uj rendszert minden
-- partnernel. Csak a dashboardon allithato: a profiles tablat a user nem
-- irhatja (lasd supabase/fiok.sql), a profil_mentese csak a nevet menti.
alter table public.profiles add column if not exists tesztelo boolean not null default false;

-- A partners.json ujBevaltas kapcsoloja, szerveroldalon is
alter table public.partners add column if not exists uj_bevaltas boolean not null default false;

-- Online kodok dropokhoz is
alter table public.code_pool drop constraint if exists code_pool_tipus_check;
alter table public.code_pool
  add constraint code_pool_tipus_check check (tipus in ('welcome', 'normal', 'drop'));

-- ---------------------------------------------------------------------
-- 2. Ajanlatok
-- ---------------------------------------------------------------------
create table if not exists public.offers (
  id bigint generated always as identity primary key,
  -- Belso azonosito, pl. "sugar-bowling-alap". A teszteke PROBA- kezdetu.
  nev text not null unique,
  tipus text not null check (tipus in ('alap', 'welcome', 'drop')),
  partner_slug text not null references public.partners (slug),
  -- Amit a user lat, pl. "2 jegy 1 áráért" vagy "−5 000 Ft a foglalásból"
  szoveg text not null check (char_length(btrim(szoveg)) between 1 and 80),
  -- Rovid jelveny a kartya sarkaba, pl. "−20%" vagy "2=1". Ures: nincs robbanas.
  jelveny text check (jelveny is null or char_length(jelveny) between 1 and 8),
  mod text not null check (mod in ('helyszini', 'online_kod')),
  -- alap es welcome: havi keret; drop: az osszes darab
  keret integer not null check (keret >= 0),
  -- alap: ennyiszer valthatja be egy user ugyanannal a partnernel egy nap
  napi_limit integer check (napi_limit is null or napi_limit >= 1),
  -- Az igenyelt kod ennyi napig ervenyes (welcome 30, drop 7)
  ervenyes_nap integer not null default 30 check (ervenyes_nap >= 1),
  -- 1 = hetfo ... 7 = vasarnap. Ures: minden nap.
  napok integer[],
  drop_kezdes timestamptz,
  drop_vege timestamptz,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  constraint offers_drop_ido check (
    (tipus = 'drop') = (drop_kezdes is not null and drop_vege is not null)
    and (drop_vege is null or drop_vege > drop_kezdes)
  )
);

-- Partnerenkent egy aktiv alap ajanlat
create unique index if not exists offers_egy_alap
  on public.offers (partner_slug)
  where tipus = 'alap' and aktiv;

create index if not exists offers_drop_idx on public.offers (drop_kezdes) where tipus = 'drop';

alter table public.offers enable row level security;
revoke all on public.offers from anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Igenylesek. A statusz szamolt:
--      bevaltva nem ures  -> bevaltott
--      lejarat a jovoben  -> aktiv
--      kulonben           -> lejart
-- ---------------------------------------------------------------------
create table if not exists public.claims (
  id uuid primary key default gen_random_uuid(),
  -- Fioktorleskor nev nelkul megmarad, hogy a keret ne nojon vissza
  user_id uuid references auth.users (id) on delete set null,
  offer_id bigint not null references public.offers (id),
  partner_slug text not null references public.partners (slug),
  tipus text not null check (tipus in ('alap', 'welcome', 'drop')),
  -- Az ajanlat szovege az igenyles pillanataban
  szoveg text not null,
  igenyelve timestamptz not null default now(),
  -- A budapesti honap elso napja, erre szamoljuk a havi keretet
  honap date not null default (date_trunc('month', now() at time zone 'Europe/Budapest'))::date,
  bevaltva timestamptz,
  lejarat timestamptz not null,
  -- Online partnernel a kiosztott kod
  kod text,
  -- A penztarosnak, pl. "K7QM"
  rovid_kod text not null default public.rovid_kod()
);

-- Egy fiok egy dropra egyszer
create unique index if not exists claims_egy_drop
  on public.claims (user_id, offer_id)
  where tipus = 'drop';

-- Welcome: useronkent legfeljebb egy bevaltott
create unique index if not exists claims_egy_welcome
  on public.claims (user_id)
  where tipus = 'welcome' and bevaltva is not null;

create index if not exists claims_user_idx on public.claims (user_id, igenyelve desc);
create index if not exists claims_offer_idx on public.claims (offer_id, honap);

alter table public.claims enable row level security;

drop policy if exists "sajat igenylesek olvasasa" on public.claims;
create policy "sajat igenylesek olvasasa"
  on public.claims
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.claims from anon, authenticated;
grant select on public.claims to authenticated;

-- ---------------------------------------------------------------------
-- 4. Keret. Belso fuggvenyek, kivulrol nem hivhatok.
-- ---------------------------------------------------------------------
create or replace function public.ez_a_honap()
returns date
language sql
stable
as $$
  select (date_trunc('month', now() at time zone 'Europe/Budapest'))::date
$$;

-- Felhasznalt darab:
--   alap:    az ebben a honapban igenyeltek (igenyles = bevaltas)
--   welcome: az ebben a honapban igenyeltek, kiveve a lejart, be nem valtottakat
--   drop:    az osszes igenyles
create or replace function public.ajanlat_felhasznalt(p_ajanlat bigint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(c.id)::integer
  from public.offers o
  join public.claims c on c.offer_id = o.id
  where o.id = p_ajanlat
    and case o.tipus
      when 'drop' then true
      when 'alap' then c.honap = public.ez_a_honap()
      else c.honap = public.ez_a_honap() and (c.bevaltva is not null or c.lejarat > now())
    end
$$;

-- Szabad darab. Online partnernel a szabad kodok szama is korlatozza
-- (alap -> normal, welcome -> welcome, drop -> drop tipusu kodok).
create or replace function public.ajanlat_szabad(p_ajanlat bigint)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(
    0,
    case when o.mod = 'online_kod' then
      least(
        o.keret - public.ajanlat_felhasznalt(o.id),
        (select count(*) from public.code_pool k
          where k.partner_slug = o.partner_slug
            and k.tipus = case o.tipus when 'alap' then 'normal' else o.tipus end
            and k.assigned_at is null
            and (k.valid_until is null or k.valid_until >= (now() at time zone 'Europe/Budapest')::date))::integer
      )
    else o.keret - public.ajanlat_felhasznalt(o.id)
    end
  )
  from public.offers o
  where o.id = p_ajanlat
$$;

-- Hasznalhatja-e a user az uj rendszert ennel a partnernel: ha a partnernel
-- be van kapcsolva, vagy ha tesztelo
create or replace function public.uj_jogosult(p_uid uuid, p_partner text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select uj_bevaltas from public.partners where slug = p_partner), false)
      or coalesce((select tesztelo from public.profiles where id = p_uid), false)
$$;

-- ---------------------------------------------------------------------
-- 5. Nyilvanos kinalat. Kijelentkezve is hivhato: az aktiv ajanlatok,
--    a szabad darab, a kovetkezo keretinditas es a szerver ideje (a drop
--    visszaszamlalojahoz). A lezart dropok 7 napig maradnak a listan.
-- ---------------------------------------------------------------------
create or replace function public.kinalat()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'most', now(),
    'uj_keret', (public.ez_a_honap() + interval '1 month')::date,
    'ajanlatok', coalesce((
      select json_agg(
        json_build_object(
          'id', o.id,
          'tipus', o.tipus,
          'partner_slug', o.partner_slug,
          'partner', p.name,
          'szoveg', o.szoveg,
          'jelveny', o.jelveny,
          'mod', o.mod,
          'keret', o.keret,
          'szabad', public.ajanlat_szabad(o.id),
          'napi_limit', o.napi_limit,
          'napok', o.napok,
          'ervenyes_nap', o.ervenyes_nap,
          'drop_kezdes', o.drop_kezdes,
          'drop_vege', o.drop_vege,
          -- Dropnal az utolso igenyles ideje: ebbol lesz az "Elfogyott X perc alatt"
          'utolso_igenyles', case when o.tipus = 'drop'
            then (select max(c.igenyelve) from public.claims c where c.offer_id = o.id) end
        )
        order by o.tipus, o.drop_kezdes nulls last, p.name
      )
      from public.offers o
      join public.partners p on p.slug = o.partner_slug
      where o.aktiv and p.active
        and (o.tipus <> 'drop' or o.drop_vege > now() - interval '7 days')
    ), '[]'::json)
  )
$$;

revoke execute on function public.ajanlat_felhasznalt(bigint) from public, anon, authenticated;
revoke execute on function public.ajanlat_szabad(bigint) from public, anon, authenticated;
revoke execute on function public.uj_jogosult(uuid, text) from public, anon, authenticated;
revoke execute on function public.kinalat() from public;
grant execute on function public.kinalat() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Atvezetes es teszt ajanlatok. Csak ami meg nincs (nev szerint).
-- ---------------------------------------------------------------------
-- a) A partnerek mostani %-os kedvezmenye alap ajanlat lesz. A keret
--    helykitolto (100), a valodit te adod meg.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'partners' and column_name = 'normal_pct') then
    execute $q$
      insert into public.offers (nev, tipus, partner_slug, szoveg, jelveny, mod, keret, napi_limit, napok)
      select p.slug || '-alap', 'alap', p.slug, p.normal_pct || '% kedvezmény', p.normal_pct || '%',
             p.mode, 100, 1, p.allowed_days
      from public.partners p
      where p.active and p.slug not like 'proba-%'
      on conflict (nev) do nothing
    $q$;
  end if;
end $$;

-- b) A mostani udvozlo ajandekok welcome ajanlat lesznek, havi 10 darabbal
do $$
begin
  if to_regclass('public.welcome_offers') is not null then
    execute $q$
      insert into public.offers (nev, tipus, partner_slug, szoveg, jelveny, mod, keret, ervenyes_nap)
      select w.partner_slug || '-welcome', 'welcome', w.partner_slug, w.pct || '% kedvezmény', w.pct || '%',
             p.mode, 10, 30
      from public.welcome_offers w
      join public.partners p on p.slug = w.partner_slug
      where w.active
      on conflict (nev) do nothing
    $q$;
  end if;
end $$;

-- c) Teszt partnerek es ajanlatok, PROBA- elotaggal. Torles:
--      delete from public.claims where offer_id in (select id from public.offers where nev like 'PROBA-%');
--      delete from public.offers where nev like 'PROBA-%';
--      delete from public.partners where slug like 'proba-%';
-- A normal_pct a 2. fazisban megszunik, addig a teszt partnereknel ures
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'partners' and column_name = 'normal_pct') then
    alter table public.partners alter column normal_pct drop not null;
  end if;
end $$;

insert into public.partners (slug, name, mode)
values
  ('proba-hely', 'PROBA Helyszíni', 'helyszini'),
  ('proba-online', 'PROBA Online', 'online_kod')
on conflict (slug) do nothing;

insert into public.offers (nev, tipus, partner_slug, szoveg, jelveny, mod, keret, napi_limit, ervenyes_nap, drop_kezdes, drop_vege)
values
  ('PROBA-alap-hely', 'alap', 'proba-hely', '2 jegy 1 áráért', '2=1', 'helyszini', 25, 1, 30, null, null),
  ('PROBA-alap-online', 'alap', 'proba-online', '−5 000 Ft a foglalásból', null, 'online_kod', 3, 1, 30, null, null),
  ('PROBA-welcome', 'welcome', 'proba-hely', '50% kedvezmény', '50%', 'helyszini', 10, null, 30, null, null),
  -- Elo drop: most indul, 3 napig tart
  ('PROBA-drop-elo', 'drop', 'proba-hely', 'Ingyen belépő 2 főre', 'FREE', 'helyszini', 15, null, 7,
    now(), now() + interval '3 days'),
  -- Kozelgo drop: a kovetkezo csutortok 19:30, budapesti ido szerint, 2 oraig
  ('PROBA-drop-csutortok', 'drop', 'proba-hely', '3 játék 2 áráért', '3=2', 'helyszini', 15, null, 7,
    (date_trunc('week', now() at time zone 'Europe/Budapest') + interval '3 days 19 hours 30 minutes'
      + case when now() at time zone 'Europe/Budapest'
                  >= date_trunc('week', now() at time zone 'Europe/Budapest') + interval '3 days 19 hours 30 minutes'
             then interval '7 days' else interval '0' end) at time zone 'Europe/Budapest',
    (date_trunc('week', now() at time zone 'Europe/Budapest') + interval '3 days 21 hours 30 minutes'
      + case when now() at time zone 'Europe/Budapest'
                  >= date_trunc('week', now() at time zone 'Europe/Budapest') + interval '3 days 19 hours 30 minutes'
             then interval '7 days' else interval '0' end) at time zone 'Europe/Budapest')
on conflict (nev) do nothing;
