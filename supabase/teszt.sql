-- =====================================================================
-- Teszteleshez. Futtasd a Supabase SQL Editorban, a supabase/drop.sql
-- UTAN. Tobbszor is lefuttathato. Elesites elott lasd GOLIVE.md.
--
--   1. Tesztelok e-mail szerint: aki ezzel a cimmel regisztral, magatol
--      tesztelo lesz, fioktorles es ujraregisztracio utan is. A cimeket NEM
--      ebbe a fajlba irjuk (a repo nyilvanos lehet), hanem a dashboardon:
--        insert into public.tesztelo_emailek (email) values ('...');
--   2. teszt_ajandek_visszaallitas(): a tesztelo torolheti a sajat welcome
--      ajandekat, hogy ujra valaszthasson. Mas nem hivhatja.
-- =====================================================================

create table if not exists public.tesztelo_emailek (
  email text primary key check (email = lower(btrim(email)))
);

alter table public.tesztelo_emailek enable row level security;
revoke all on public.tesztelo_emailek from anon, authenticated;

-- Uj profilnal: ha a fiok e-mailje a listan van, tesztelo
create or replace function public.tesztelo_beallitasa()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.tesztelo_emailek t
    join auth.users u on lower(u.email) = t.email
    where u.id = new.id
  ) then
    new.tesztelo := true;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_tesztelo on public.profiles;
create trigger profiles_tesztelo
  before insert on public.profiles
  for each row execute function public.tesztelo_beallitasa();

revoke execute on function public.tesztelo_beallitasa() from public, anon, authenticated;

-- A tesztelo a sajat welcome ajandekat torolheti (a kiosztott kod
-- visszakerul a kodbankba), hogy ujra valaszthasson
create or replace function public.teszt_ajandek_visszaallitas()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_db integer;
begin
  if v_uid is null then
    return json_build_object('statusz', 'nincs_belepve');
  end if;

  if not coalesce((select tesztelo from public.profiles where id = v_uid), false) then
    return json_build_object('statusz', 'nem_tesztelo');
  end if;

  update public.code_pool k set assigned_to = null, assigned_at = null
  from public.claims c
  where c.user_id = v_uid and c.tipus = 'welcome'
    and c.kod = k.code and c.partner_slug = k.partner_slug;

  delete from public.claims where user_id = v_uid and tipus = 'welcome';
  get diagnostics v_db = row_count;

  return json_build_object('statusz', 'ok', 'torolve', v_db);
end;
$$;

revoke execute on function public.teszt_ajandek_visszaallitas() from public, anon;
grant execute on function public.teszt_ajandek_visszaallitas() to authenticated;
