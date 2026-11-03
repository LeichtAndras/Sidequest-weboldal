-- =====================================================================
-- SideQuest online kodok, 3. fazis. Futtasd a Supabase SQL Editorban,
-- egyben, a supabase/bevaltas.sql UTAN. Tobbszor is lefuttathato.
--
-- Szabalyok, mind itt kikenyszeritve:
--   - kodot csak belepett user kaphat, kitoltott profillal, online partnernel
--   - egy kodot ket user sosem kaphat meg: a kiosztas FOR UPDATE SKIP LOCKED
--   - az udvozlo kod partnerenkent egyszer jar (a redemptions egyedi indexe)
--   - ugyanattol a partnertol ugyanabban a honapban ugyanazt a kodot kapja
--     vissza, nem ujat; egy usernel ket egyszerre erkezo keres sem visz el
--     ket kodot (tranzakcios zar userenkent es partnerenkent)
--   - lejart kodot nem oszt ki
--   - a kodbankot kivulrol senki nem latja, a user csak a sajat kodjait
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Kodbank. Havonta CSV-bol toltod fel, lasd supabase/KODOK-FELTOLTESE.md
-- ---------------------------------------------------------------------
create table if not exists public.code_pool (
  id bigint generated always as identity primary key,
  partner_slug text not null references public.partners (slug),
  code text not null,
  tipus text not null default 'normal' check (tipus in ('welcome', 'normal')),
  -- Az utolso nap, amikor a kod meg hasznalhato. Ures: nincs lejarata.
  valid_until date,
  -- Ha a user torli a fiokjat, a kod nem kerul vissza a bankba: az
  -- assigned_at megmarad, csak a hozzarendeles nullazodik.
  assigned_to uuid references auth.users (id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  unique (partner_slug, code)
);

create index if not exists code_pool_szabad_idx
  on public.code_pool (partner_slug, tipus, valid_until)
  where assigned_at is null;

alter table public.code_pool enable row level security;
revoke all on public.code_pool from anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Kod kerese. A szerver donti el, melyik jar:
--    a) ha ebben a honapban mar kapott kodot ettol a partnertol: ugyanazt
--    b) kulonben, ha meg nem kapott udvozlo kodot es van szabad: azt
--    c) kulonben egy uj havi kodot
--    Ha nincs szabad kod: "elfogyott".
-- ---------------------------------------------------------------------
create or replace function public.online_kod_kerese(p_partner text)
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
  v_kod public.code_pool%rowtype;
  v_tipus text;
  v_ma date := (now() at time zone 'Europe/Budapest')::date;
  v_honap_eleje timestamptz :=
    date_trunc('month', now() at time zone 'Europe/Budapest') at time zone 'Europe/Budapest';
  v_lejarat timestamptz;
  v_ujra boolean := false;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  select first_name into v_nev from public.profiles where id = v_uid;
  if v_nev is null then
    return json_build_object('statusz', 'nincs_profil');
  end if;

  select * into v_p from public.partners where slug = p_partner and active;
  if not found then
    return json_build_object('statusz', 'nincs_partner');
  end if;

  if v_p.mode <> 'online_kod' then
    return json_build_object('statusz', 'helyszini_partner');
  end if;

  -- Egy user egy partnernel egyszerre csak egy kerest futtathat
  perform pg_advisory_xact_lock(hashtext(v_uid::text || '|' || p_partner));

  -- a) a honap kodja, ha mar megvan (udvozlo vagy havi)
  select * into v_r
  from public.redemptions
  where user_id = v_uid and partner_slug = p_partner
    and code is not null and created_at >= v_honap_eleje
  order by created_at desc
  limit 1;

  if found then
    v_ujra := true;
  else
    -- b) udvozlo kod, ha meg nem kapott
    if not exists (
      select 1 from public.redemptions
      where user_id = v_uid and partner_slug = p_partner and tipus = 'welcome'
    ) then
      select * into v_kod
      from public.code_pool
      where partner_slug = p_partner and tipus = 'welcome' and assigned_at is null
        and (valid_until is null or valid_until >= v_ma)
      order by valid_until nulls last, id
      limit 1
      for update skip locked;

      if found then
        v_tipus := 'welcome';
      end if;
    end if;

    -- c) uj havi kod
    if v_tipus is null then
      select * into v_kod
      from public.code_pool
      where partner_slug = p_partner and tipus = 'normal' and assigned_at is null
        and (valid_until is null or valid_until >= v_ma)
      order by valid_until nulls last, id
      limit 1
      for update skip locked;

      if not found then
        return json_build_object('statusz', 'elfogyott');
      end if;
      v_tipus := 'normal';
    end if;
  end if;

  if not v_ujra then
    update public.code_pool
    set assigned_to = v_uid, assigned_at = now()
    where id = v_kod.id;

    -- A kod lejarata a nap vegeig tart; ha nincs megadva, az udvozlo 30
    -- napig, a havi a honap vegeig szamit ervenyesnek a felhasznalonak
    v_lejarat := coalesce(
      (v_kod.valid_until + 1)::timestamp at time zone 'Europe/Budapest',
      case when v_tipus = 'welcome' then now() + interval '30 days'
           else v_honap_eleje + interval '1 month' end
    );

    insert into public.redemptions (user_id, partner_slug, tipus, pct, short_code, code, expires_at)
    values (
      v_uid, p_partner, v_tipus,
      case when v_tipus = 'welcome' then v_p.welcome_pct else v_p.normal_pct end,
      public.rovid_kod(), v_kod.code, v_lejarat
    )
    returning * into v_r;
  end if;

  return json_build_object(
    'statusz', 'ok',
    'ujra', v_ujra,
    'tipus', v_r.tipus,
    'pct', v_r.pct,
    'kod', v_r.code,
    'lejarat', v_r.expires_at,
    'partner', v_p.name
  );
end;
$$;

revoke execute on function public.online_kod_kerese(text) from public, anon;
grant execute on function public.online_kod_kerese(text) to authenticated;
