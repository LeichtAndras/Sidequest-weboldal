-- =====================================================================
-- SideQuest fiokok, 1. fazis. Futtasd a Supabase SQL Editorban, egyben.
-- Tobbszor is lefuttathato, nem rontja el a meglevo adatokat.
--
-- A szabalyok itt vannak kikenyszeritve, nem a frontenden:
--   - a profilt mindenki csak a sajatjat latja
--   - profilt csak a profil_mentese() hoz letre, es csak akkor, ha mindket
--     checkbox be van pipalva; az elfogadas idopontjat a szerver irja
--   - torolni csak a sajat fiokot lehet, a fiok_torlese() fuggvennyel
-- Az anon kulcs eleg mindenhez, a service_role kulcs nem kell.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Profilok. Az auth.users sorahoz kotve, igy a fiok torlesekor a
--    profil is torlodik (on delete cascade).
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null
    check (char_length(btrim(first_name)) between 1 and 40),
  age_16_confirmed_at timestamptz not null,
  privacy_accepted_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Csak olvasni lehet, es csak a sajat sort. Beszurni, modositani es
-- torolni kozvetlenul nem lehet, arra nincs policy.
drop policy if exists "sajat profil olvasasa" on public.profiles;
create policy "sajat profil olvasasa"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

-- Az anon szerepkor semmit nem csinalhat a tablaval, meg RLS mogott sem.
revoke all on public.profiles from anon;
revoke insert, update, delete on public.profiles from authenticated;
grant select on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 2. Profil mentese a belepes utan. Uj fioknal letrehozza, meglevonel a
--    nevet frissiti. Az elfogadas idopontjai az elso mentes ideje maradnak.
-- ---------------------------------------------------------------------
create or replace function public.profil_mentese(
  p_keresztnev text,
  p_elmult_16 boolean,
  p_elfogadja boolean
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nev text := btrim(coalesce(p_keresztnev, ''));
begin
  if auth.uid() is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  if not coalesce(p_elmult_16, false) or not coalesce(p_elfogadja, false) then
    return json_build_object('statusz', 'hianyzo_elfogadas');
  end if;

  if char_length(v_nev) < 1 or char_length(v_nev) > 40 then
    return json_build_object('statusz', 'rossz_nev');
  end if;

  insert into public.profiles (id, first_name, age_16_confirmed_at, privacy_accepted_at)
  values (auth.uid(), v_nev, now(), now())
  on conflict (id) do update
    set first_name = excluded.first_name;

  return json_build_object('statusz', 'ok');
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Fiok torlese, minden adattal. Az auth.users sor torlese viszi a
--    profilt is. A kesobbi beváltások es kodok tablai is ide kotodnek.
-- ---------------------------------------------------------------------
create or replace function public.fiok_torlese()
returns json
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  delete from auth.users where id = auth.uid();
  return json_build_object('statusz', 'ok');
end;
$$;

-- A fuggvenyek alapbol mindenkinek futtathatok. Csak belepett user hivhatja.
revoke execute on function public.profil_mentese(text, boolean, boolean) from public, anon;
revoke execute on function public.fiok_torlese() from public, anon;
grant execute on function public.profil_mentese(text, boolean, boolean) to authenticated;
grant execute on function public.fiok_torlese() to authenticated;
