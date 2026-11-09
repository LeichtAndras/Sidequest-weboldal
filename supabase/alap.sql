-- =====================================================================
-- SideQuest alap kedvezmeny, 2. fazis. Futtasd a Supabase SQL Editorban,
-- egyben, a supabase/ajanlatok.sql UTAN. Tobbszor is lefuttathato.
--
-- Az alap kedvezmenynel az igenyles es a bevaltas egy lepes:
--   helyszini:  "Beváltom" -> teljes kepernyo 5 percig; azonnal bevaltott
--   online_kod: kod a kodbankbol; azonnal bevaltott
--
-- Szabalyok, mind itt kikenyszeritve:
--   - csak belepett user, kitoltott profillal
--   - csak ha a partnernel be van kapcsolva az uj rendszer, vagy tesztelo
--   - napok (pl. Magic Rooms csak hetkoznap)
--   - napi limit: egy user egy partnernel naponta ennyiszer (napi_limit)
--   - havi keret: az ajanlat sora zarolva (FOR UPDATE), igy az utolso
--     darabot ket user nem kaphatja meg
--   - a helyszini kepernyo 5 percen belul ujranyithato, nem von le ujra
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. A regi beváltás kivezetese. Az uj igenylesek a claims tablaban vannak.
-- ---------------------------------------------------------------------
drop function if exists public.bevaltas_inditasa(text, text);
drop function if exists public.online_kod_kerese(text);
drop table if exists public.redemptions;
alter table public.partners drop column if exists normal_pct;

-- ---------------------------------------------------------------------
-- 1. Alap kedvezmeny bevaltasa
-- ---------------------------------------------------------------------
create or replace function public.alap_bevaltas(p_ajanlat bigint)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_nev text;
  v_o public.offers%rowtype;
  v_partner text;
  v_c public.claims%rowtype;
  v_kod public.code_pool%rowtype;
  v_ma date := (now() at time zone 'Europe/Budapest')::date;
  v_nap integer := extract(isodow from (now() at time zone 'Europe/Budapest'))::integer;
  v_mai integer;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  select first_name into v_nev from public.profiles where id = v_uid;
  if v_nev is null then
    return json_build_object('statusz', 'nincs_profil');
  end if;

  -- Az ajanlat sora zarolva: erre az ajanlatra egyszerre egy igenyles fut
  select * into v_o from public.offers where id = p_ajanlat and tipus = 'alap' for update;
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

  -- Ujranyitas: a helyszini kepernyo 5 percig el, addig ugyanazt adjuk vissza
  if v_o.mod = 'helyszini' then
    select * into v_c
    from public.claims
    where user_id = v_uid and offer_id = v_o.id and lejarat > now()
    order by igenyelve desc
    limit 1;
  end if;

  if v_c.id is null then
    if v_o.napok is not null and not (v_nap = any (v_o.napok)) then
      return json_build_object('statusz', 'ma_nem_ervenyes');
    end if;

    if v_o.napi_limit is not null then
      select count(*) into v_mai
      from public.claims
      where user_id = v_uid and partner_slug = v_o.partner_slug and tipus = 'alap'
        and (igenyelve at time zone 'Europe/Budapest')::date = v_ma;
      if v_mai >= v_o.napi_limit then
        return json_build_object('statusz', 'napi_limit');
      end if;
    end if;

    if public.ajanlat_szabad(v_o.id) < 1 then
      return json_build_object('statusz', 'elfogyott');
    end if;

    if v_o.mod = 'online_kod' then
      select * into v_kod
      from public.code_pool
      where partner_slug = v_o.partner_slug and tipus = 'normal' and assigned_at is null
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
      v_uid, v_o.id, v_o.partner_slug, 'alap', v_o.szoveg, now(),
      case when v_o.mod = 'helyszini' then now() + interval '5 minutes'
           else coalesce((v_kod.valid_until + 1)::timestamp at time zone 'Europe/Budapest',
                         now() + make_interval(days => v_o.ervenyes_nap)) end,
      v_kod.code
    )
    returning * into v_c;
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
    'lejarat', v_c.lejarat,
    'most', now()
  );
end;
$$;

revoke execute on function public.alap_bevaltas(bigint) from public, anon;
grant execute on function public.alap_bevaltas(bigint) to authenticated;
