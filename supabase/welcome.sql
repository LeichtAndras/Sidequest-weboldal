-- =====================================================================
-- SideQuest welcome ajandek, 3. fazis. Futtasd a Supabase SQL Editorban,
-- egyben, a supabase/alap.sql UTAN. Tobbszor is lefuttathato.
--
-- Szabalyok, mind itt kikenyszeritve:
--   - fiokonkent osszesen egy welcome ajandek: egyszerre egy aktiv
--     valasztas, es legfeljebb egy bevaltott (egyedi index a claims-en)
--   - partnerenkent havi keret (offers.keret), minden honap 1-jen ujraindul;
--     a lejart, be nem valtott valasztas nem szamit bele (visszakerul)
--   - valasztaskor levonodik a keretbol, az ajanlat sora zarolva
--   - helyszini partnernel a valasztastol 30 napja van a pultnal bevaltani,
--     ugyanazzal a teljes kepernyovel; online partnernel valasztaskor
--     megkapja a kodot, es az mar bevaltottnak szamit
--   - csak ha a partnernel be van kapcsolva az uj rendszer, vagy tesztelo
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. A regi ajandekrendszer kivezetese (welcome_offers, welcome_claims)
-- ---------------------------------------------------------------------
drop function if exists public.ajandek_valasztasa(bigint);
drop function if exists public.ajandekom();
drop function if exists public.ajandek_lista();
drop table if exists public.welcome_claims;
drop table if exists public.welcome_offers;

-- ---------------------------------------------------------------------
-- 1. Welcome ajandek valasztasa
-- ---------------------------------------------------------------------
create or replace function public.welcome_valasztas(p_ajanlat bigint)
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

  -- Egy user egyszerre csak egy valasztast futtathat
  perform pg_advisory_xact_lock(hashtext('welcome|' || v_uid::text));

  if exists (select 1 from public.claims where user_id = v_uid and tipus = 'welcome' and bevaltva is not null) then
    return json_build_object('statusz', 'mar_bevaltotta');
  end if;

  if exists (
    select 1 from public.claims
    where user_id = v_uid and tipus = 'welcome' and bevaltva is null and lejarat > now()
  ) then
    return json_build_object('statusz', 'mar_valasztott');
  end if;

  -- Az ajanlat sora zarolva: az utolso darabot csak egy user kapja meg
  select * into v_o from public.offers where id = p_ajanlat and tipus = 'welcome' for update;
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

  if public.ajanlat_szabad(v_o.id) < 1 then
    return json_build_object('statusz', 'elfogyott');
  end if;

  if v_o.mod = 'online_kod' then
    select * into v_kod
    from public.code_pool
    where partner_slug = v_o.partner_slug and tipus = 'welcome' and assigned_at is null
      and (valid_until is null or valid_until >= v_ma)
    order by valid_until nulls last, id
    limit 1
    for update skip locked;

    if not found then
      return json_build_object('statusz', 'elfogyott');
    end if;

    update public.code_pool set assigned_to = v_uid, assigned_at = now() where id = v_kod.id;
  end if;

  insert into public.claims (user_id, offer_id, partner_slug, tipus, szoveg, bevaltva, lejarat, kod)
  values (
    v_uid, v_o.id, v_o.partner_slug, 'welcome', v_o.szoveg,
    case when v_o.mod = 'online_kod' then now() end,
    case when v_o.mod = 'online_kod'
      then coalesce((v_kod.valid_until + 1)::timestamp at time zone 'Europe/Budapest',
                    now() + make_interval(days => v_o.ervenyes_nap))
      else now() + make_interval(days => v_o.ervenyes_nap) end,
    v_kod.code
  )
  returning * into v_c;

  return json_build_object(
    'statusz', 'ok',
    'id', v_c.id,
    'partner_slug', v_c.partner_slug,
    'partner', v_partner,
    'szoveg', v_c.szoveg,
    'mod', v_o.mod,
    'kod', v_c.kod,
    'lejarat', v_c.lejarat
  );
end;
$$;

-- 2. A pultnal valo bevaltas a supabase/drop.sql-ben van (igenyles_bevaltas),
--    kozosen a droppal. A regi welcome_bevaltas megszunt.

revoke execute on function public.welcome_valasztas(bigint) from public, anon;
grant execute on function public.welcome_valasztas(bigint) to authenticated;
