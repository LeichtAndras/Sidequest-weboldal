-- =====================================================================
-- SideQuest filmszavazas. Futtasd a Supabase SQL Editorban, egyben.
-- Uj projektnel ez a teljes sema. Meglevo, TMDB-s valtozatrol a
-- supabase/migration-wikidata.sql visz at.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. A szavazas ablaka a szerveren is. A frontend JSON csak a kijelzeshez
--    kell, az ervenyesseget ez a tabla donti el.
-- ---------------------------------------------------------------------
create table if not exists public.vote_settings (
  id boolean primary key default true,
  vote_start timestamptz not null,
  vote_end timestamptz not null,
  constraint vote_settings_egy_sor check (id)
);

alter table public.vote_settings enable row level security;
-- Nincs policy: anon kulccsal sem olvashato, sem irhato kozvetlenul.

insert into public.vote_settings (id, vote_start, vote_end)
values (true, '2026-10-04T00:00:00+02:00', '2026-10-11T23:59:59+02:00')
on conflict (id) do update
  set vote_start = excluded.vote_start,
      vote_end = excluded.vote_end;

-- ---------------------------------------------------------------------
-- 2. Szavazatok. Egy eszkoz egy szavazat, nyers IP sosem kerul be.
--    A film azonositoja Wikidata QID, pl. "Q12345".
-- ---------------------------------------------------------------------
create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  wikidata_id text not null,
  title text not null,
  year integer,
  director text,
  device_id text not null unique,
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.votes enable row level security;
-- Szandekosan nincs policy. Anon nem tud sem beszurni, sem olvasni.
-- Minden hozzaferes a ket security definer fuggvenyen keresztul megy.

create index if not exists votes_wikidata_id_idx on public.votes (wikidata_id);
create index if not exists votes_ip_hash_idx on public.votes (ip_hash);

-- ---------------------------------------------------------------------
-- 3. Szavazas. Visszautasit, ha az ablakon kivul vagyunk, ha errol az
--    eszkozrol mar jott szavazat, vagy ha errol az IP-rol mar 10 erkezett.
-- ---------------------------------------------------------------------
create or replace function public.cast_vote(
  p_wikidata_id text,
  p_title text,
  p_year integer,
  p_director text,
  p_device_id text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end   timestamptz;
  v_ip    text;
  v_hash  text;
  v_db    integer;
begin
  if p_device_id is null or length(btrim(p_device_id)) < 8 then
    return json_build_object('statusz', 'nincs_nyitva');
  end if;

  -- Csak ervenyes Wikidata azonositot fogadunk el
  if p_wikidata_id is null or p_wikidata_id !~ '^Q[0-9]+$' then
    return json_build_object('statusz', 'nincs_nyitva');
  end if;

  select vote_start, vote_end into v_start, v_end
  from public.vote_settings
  where id;

  if v_start is null or now() < v_start or now() > v_end then
    return json_build_object('statusz', 'nincs_nyitva');
  end if;

  -- Az x-forwarded-for lanc elso eleme a kliens IP-je. Csak a sha256
  -- lenyomatat taroljuk, a nyers cimet soha.
  v_ip := nullif(btrim(split_part(
    coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''),
    ',', 1
  )), '');

  v_hash := case when v_ip is null then null
                 else encode(sha256(v_ip::bytea), 'hex') end;

  if exists (select 1 from public.votes where device_id = p_device_id) then
    return json_build_object('statusz', 'mar_szavaztal');
  end if;

  if v_hash is not null then
    select count(*) into v_db from public.votes where ip_hash = v_hash;
    if v_db >= 10 then
      return json_build_object('statusz', 'tul_sok');
    end if;
  end if;

  insert into public.votes (wikidata_id, title, year, director, device_id, ip_hash)
  values (
    p_wikidata_id,
    left(btrim(p_title), 200),
    p_year,
    left(btrim(p_director), 120),
    btrim(p_device_id),
    v_hash
  );

  return json_build_object('statusz', 'ok');
exception
  when unique_violation then
    return json_build_object('statusz', 'mar_szavaztal');
end;
$$;

revoke all on function public.cast_vote(text, text, integer, text, text) from public;
grant execute on function public.cast_vote(text, text, integer, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Toplista: az elso ot film es az osszes szavazat szama.
--    A cim, az ev es a rendezo a legfrissebb szavazatbol jon az adott filmhez.
-- ---------------------------------------------------------------------
create or replace function public.get_leaderboard()
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'osszes', (select count(*) from public.votes),
    'lista', coalesce(
      (
        select json_agg(sor)
        from (
          select
            wikidata_id,
            (array_agg(title    order by created_at desc))[1] as title,
            (array_agg(year     order by created_at desc))[1] as year,
            (array_agg(director order by created_at desc))[1] as director,
            count(*)::int as szavazat
          from public.votes
          group by wikidata_id
          order by count(*) desc, min(created_at) asc
          limit 5
        ) sor
      ),
      '[]'::json
    )
  );
$$;

revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon, authenticated;
