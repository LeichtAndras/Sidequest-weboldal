-- =====================================================================
-- SideQuest beváltás, 2. fazis. Futtasd a Supabase SQL Editorban, egyben,
-- a supabase/fiok.sql UTAN. Utana a supabase/partnerek.sql jon.
-- Tobbszor is lefuttathato.
--
-- Minden szabaly itt van kikenyszeritve, nem a frontenden:
--   - beváltást csak belepett user indithat, kitoltott profillal
--   - udvozlo kedvezmeny csak ott jar, ahol a usernek aktiv udvozlo
--     ajandeka van (supabase/ajandek.sql); beváltáskor az ajandek
--     bevaltottnak szamit, ket egyszerre erkezo keres sem jut at
--   - a beváltás 5 percig ervenyes; a lejaratot es a rovid kodot a szerver adja
--   - a szazalekot a partners, udvozlonel a welcome_offers tablabol veszi,
--     nem a telefontol
--   - ha a partnernel napi korlatozas van (pl. Magic Rooms: csak hetkoznap),
--     mas napon nem lehet beváltani
--   - a user csak a sajat beváltásait latja
-- Csak az anon kulcs kell, a service_role kulcs nem.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Partnerek. Csak a fuggvenyek olvassak, kozvetlenul senki.
--    A tartalmat a supabase/partnerek.sql tolti fel (npm run partnerek-sql).
-- ---------------------------------------------------------------------
create table if not exists public.partners (
  slug text primary key,
  name text not null,
  normal_pct integer not null check (normal_pct between 0 and 100),
  mode text not null check (mode in ('helyszini', 'online_kod')),
  -- 1 = hetfo ... 7 = vasarnap. Null: minden nap.
  allowed_days integer[],
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.partners enable row level security;
revoke all on public.partners from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Beváltások. Minden megerosites egy sor, a statisztika innen jon.
--    Az 5 percen beluli ujranyitas nem uj sor, hanem ugyanaz.
-- ---------------------------------------------------------------------
create table if not exists public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  partner_slug text not null references public.partners (slug),
  tipus text not null check (tipus in ('welcome', 'normal')),
  pct integer not null,
  short_code text not null,
  -- Online kodnal (3. fazis) itt a kiosztott kod
  code text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists redemptions_user_idx on public.redemptions (user_id, created_at desc);
create index if not exists redemptions_partner_idx on public.redemptions (partner_slug, created_at);

alter table public.redemptions enable row level security;

drop policy if exists "sajat bevaltasok olvasasa" on public.redemptions;
create policy "sajat bevaltasok olvasasa"
  on public.redemptions
  for select
  to authenticated
  using (user_id = auth.uid());

-- Olvasni a sajatjat lehet, irni csak a fuggvenyen at
revoke all on public.redemptions from anon, authenticated;
grant select on public.redemptions to authenticated;

-- ---------------------------------------------------------------------
-- 3. Rovid azonosito a pénztárosnak, pl. "K7QM". Osszetevesztheto betuk
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

-- ---------------------------------------------------------------------
-- 4. Beváltás inditasa a kasszanal. A megerosites pillanataban fut, az
--    udvozlo ajandek itt szamit bevaltottnak.
--    Ha 5 percen belul ugyanazt nyitja meg ujra, a meglevot adja vissza.
-- ---------------------------------------------------------------------
create or replace function public.bevaltas_inditasa(p_partner text, p_tipus text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nev text;
  v_p public.partners%rowtype;
  v_r public.redemptions%rowtype;
  v_pct integer;
  v_ajandek uuid;
  v_nap integer := extract(isodow from (now() at time zone 'Europe/Budapest'))::int;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  select first_name into v_nev from public.profiles where id = v_uid;
  if v_nev is null then
    return json_build_object('statusz', 'nincs_profil');
  end if;

  if p_tipus is null or p_tipus not in ('welcome', 'normal') then
    return json_build_object('statusz', 'hibas_keres');
  end if;

  select * into v_p from public.partners where slug = p_partner and active;
  if not found then
    return json_build_object('statusz', 'nincs_partner');
  end if;

  if v_p.mode <> 'helyszini' then
    return json_build_object('statusz', 'online_partner');
  end if;

  -- Egy user egy partnernel egyszerre csak egy beváltást indithat
  perform pg_advisory_xact_lock(hashtext(v_uid::text || '|' || p_partner));

  -- Ujranyitas: ugyanez a fajta, ugyanennel a partnernel, meg ervenyes
  select * into v_r
  from public.redemptions
  where user_id = v_uid and partner_slug = p_partner and tipus = p_tipus and expires_at > now()
  order by created_at desc
  limit 1;

  if not found then
    if v_p.allowed_days is not null and not (v_nap = any (v_p.allowed_days)) then
      return json_build_object('statusz', 'ma_nem_ervenyes');
    end if;

    if p_tipus = 'welcome' then
      select c.id, o.pct into v_ajandek, v_pct
      from public.welcome_claims c
      join public.welcome_offers o on o.id = c.offer_id
      where c.user_id = v_uid and o.partner_slug = p_partner
        and c.redeemed_at is null and c.expires_at > now()
      order by c.claimed_at desc
      limit 1
      for update of c;

      if not found then
        if exists (
          select 1 from public.welcome_claims c
          join public.welcome_offers o on o.id = c.offer_id
          where c.user_id = v_uid and o.partner_slug = p_partner and c.redeemed_at is not null
        ) then
          return json_build_object('statusz', 'mar_felhasznalt');
        end if;
        return json_build_object('statusz', 'nincs_ajandek');
      end if;
    else
      v_pct := v_p.normal_pct;
    end if;

    begin
      insert into public.redemptions (user_id, partner_slug, tipus, pct, short_code, expires_at)
      values (v_uid, p_partner, p_tipus, v_pct, public.rovid_kod(), now() + interval '5 minutes')
      returning * into v_r;

      if v_ajandek is not null then
        update public.welcome_claims set redeemed_at = now() where id = v_ajandek;
      end if;
    exception when unique_violation then
      -- Mar van bevaltott ajandeka: a masodik nem jut at
      return json_build_object('statusz', 'mar_felhasznalt');
    end;
  end if;

  return json_build_object(
    'statusz', 'ok',
    'id', v_r.id,
    'partner', v_p.name,
    'tipus', v_r.tipus,
    'pct', v_r.pct,
    'keresztnev', v_nev,
    'rovid_kod', v_r.short_code,
    'letrejott', v_r.created_at,
    'lejarat', v_r.expires_at,
    'most', now()
  );
end;
$$;

revoke execute on function public.rovid_kod() from public, anon, authenticated;
revoke execute on function public.bevaltas_inditasa(text, text) from public, anon;
grant execute on function public.bevaltas_inditasa(text, text) to authenticated;
