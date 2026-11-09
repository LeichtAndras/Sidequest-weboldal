-- =====================================================================
-- SideQuest drop, 4. fazis. Futtasd a Supabase SQL Editorban, egyben, a
-- supabase/welcome.sql UTAN. Tobbszor is lefuttathato.
--
-- Drop: egyszeri keret (offers.keret), drop_kezdes es drop_vege kozott
-- igenyelheto. Felvitel: lasd supabase/DROPOK.md.
--
-- Szabalyok, mind itt kikenyszeritve:
--   - fiokonkent egy igenyles dropponkent (egyedi index a claims-en)
--   - kezdes elott es a vege utan az igenylest elutasitja
--   - a keretet az ajanlat sora zarolva vonja le (FOR UPDATE): 15 darabos
--     dropbol pontosan 15 igenyles sikerul, akarhanyan nyomjak egyszerre
--   - az igenyelt kod 7 napig ervenyes (offers.ervenyes_nap); helyszini
--     partnernel a pultnal kell bevaltani, online partnernel a kod
--     kiadasa a bevaltas
--   - csak ha a partnernel be van kapcsolva az uj rendszer, vagy tesztelo
-- =====================================================================

-- A pultnal valo bevaltas kozos lett (welcome es drop): igenyles_bevaltas
drop function if exists public.welcome_bevaltas(uuid);

-- ---------------------------------------------------------------------
-- 1. Drop igenylese
-- ---------------------------------------------------------------------
create or replace function public.drop_igenyles(p_ajanlat bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_o public.offers%rowtype;
  v_partner text;
  v_kod public.code_pool%rowtype;
  v_c public.claims%rowtype;
  v_ma date := (now() at time zone 'Europe/Budapest')::date;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  if not exists (select 1 from public.profiles where id = v_uid) then
    return json_build_object('statusz', 'nincs_profil');
  end if;

  -- Az ajanlat sora zarolva: a dropra erkezo igenylesek egymas utan futnak
  select * into v_o from public.offers where id = p_ajanlat and tipus = 'drop' for update;
  if not found or not v_o.aktiv then
    return json_build_object('statusz', 'nincs_ajanlat');
  end if;

  select name into v_partner from public.partners where slug = v_o.partner_slug and active;
  if v_partner is null then
    return json_build_object('statusz', 'nincs_ajanlat');
  end if;

  if not public.uj_jogosult(v_uid, v_o.partner_slug) then
    return json_build_object('statusz', 'nem_elerheto');
  end if;

  if now() < v_o.drop_kezdes then
    return json_build_object('statusz', 'meg_nem_indult');
  end if;

  if now() >= v_o.drop_vege then
    return json_build_object('statusz', 'lezarult');
  end if;

  if exists (select 1 from public.claims where user_id = v_uid and offer_id = v_o.id) then
    return json_build_object('statusz', 'mar_igenyelted');
  end if;

  if public.ajanlat_szabad(v_o.id) < 1 then
    return json_build_object('statusz', 'elfogyott');
  end if;

  if v_o.mod = 'online_kod' then
    select * into v_kod
    from public.code_pool
    where partner_slug = v_o.partner_slug and tipus = 'drop' and assigned_at is null
      and (valid_until is null or valid_until >= v_ma)
    order by valid_until nulls last, id
    limit 1
    for update skip locked;

    if not found then
      return json_build_object('statusz', 'elfogyott');
    end if;

    update public.code_pool set assigned_to = v_uid, assigned_at = now() where id = v_kod.id;
  end if;

  begin
    insert into public.claims (user_id, offer_id, partner_slug, tipus, szoveg, bevaltva, lejarat, kod)
    values (
      v_uid, v_o.id, v_o.partner_slug, 'drop', v_o.szoveg,
      case when v_o.mod = 'online_kod' then now() end,
      case when v_o.mod = 'online_kod'
        then coalesce((v_kod.valid_until + 1)::timestamp at time zone 'Europe/Budapest',
                      now() + make_interval(days => v_o.ervenyes_nap))
        else now() + make_interval(days => v_o.ervenyes_nap) end,
      v_kod.code
    )
    returning * into v_c;
  exception when unique_violation then
    return json_build_object('statusz', 'mar_igenyelted');
  end;

  return json_build_object(
    'statusz', 'ok',
    'id', v_c.id,
    'partner', v_partner,
    'szoveg', v_c.szoveg,
    'mod', v_o.mod,
    'kod', v_c.kod,
    'lejarat', v_c.lejarat
  );
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Bevaltas a pultnal (welcome es drop, helyszini partner). Ugyanaz a
--    teljes kepernyo, mint az alapnal; 5 percen belul ujranyithato.
-- ---------------------------------------------------------------------
create or replace function public.igenyles_bevaltas(p_igenyles uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nev text;
  v_c public.claims%rowtype;
  v_o public.offers%rowtype;
  v_partner text;
  v_nap integer := extract(isodow from (now() at time zone 'Europe/Budapest'))::integer;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  select first_name into v_nev from public.profiles where id = v_uid;
  if v_nev is null then
    return json_build_object('statusz', 'nincs_profil');
  end if;

  select * into v_c
  from public.claims
  where id = p_igenyles and user_id = v_uid and tipus in ('welcome', 'drop')
  for update;
  if not found then
    return json_build_object('statusz', 'nincs_igenyles');
  end if;

  select * into v_o from public.offers where id = v_c.offer_id;
  select name into v_partner from public.partners where slug = v_c.partner_slug;

  if v_o.mod <> 'helyszini' then
    return json_build_object('statusz', 'online_partner');
  end if;

  if not public.uj_jogosult(v_uid, v_c.partner_slug) then
    return json_build_object('statusz', 'nem_elerheto');
  end if;

  if v_c.bevaltva is not null then
    -- Ujranyitas: a kepernyo 5 percig el
    if v_c.bevaltva <= now() - interval '5 minutes' then
      return json_build_object('statusz', 'mar_felhasznalt');
    end if;
  else
    if v_c.lejarat <= now() then
      return json_build_object('statusz', 'lejart');
    end if;

    if v_o.napok is not null and not (v_nap = any (v_o.napok)) then
      return json_build_object('statusz', 'ma_nem_ervenyes');
    end if;

    begin
      update public.claims set bevaltva = now() where id = v_c.id returning * into v_c;
    exception when unique_violation then
      -- Welcome: mar van bevaltott welcome ajandeka
      return json_build_object('statusz', 'mar_felhasznalt');
    end;
  end if;

  return json_build_object(
    'statusz', 'ok',
    'id', v_c.id,
    'tipus', v_c.tipus,
    'mod', v_o.mod,
    'partner', v_partner,
    'szoveg', v_c.szoveg,
    'jelveny', v_o.jelveny,
    'keresztnev', v_nev,
    'rovid_kod', v_c.rovid_kod,
    'kod', v_c.kod,
    'bevaltva', v_c.bevaltva,
    -- A kepernyo lejarata, nem a kode
    'lejarat', v_c.bevaltva + interval '5 minutes',
    'most', now()
  );
end;
$$;

revoke execute on function public.drop_igenyles(bigint) from public, anon;
grant execute on function public.drop_igenyles(bigint) to authenticated;
revoke execute on function public.igenyles_bevaltas(uuid) from public, anon;
grant execute on function public.igenyles_bevaltas(uuid) to authenticated;
