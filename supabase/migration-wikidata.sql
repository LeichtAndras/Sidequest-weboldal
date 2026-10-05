-- =====================================================================
-- Atallas TMDB-rol Wikidatara. A votes tabla ures, ezert eldobjuk es
-- ujraepitjuk. Futtasd egyben a Supabase SQL Editorban.
-- A vote_settings tabla erintetlen marad.
-- =====================================================================

-- 1. Regi fuggvenyek es tabla el
drop function if exists public.cast_vote(integer, text, integer, text, text);
drop function if exists public.get_leaderboard();
drop table if exists public.votes;

-- 2. Uj tabla: tmdb_id helyett wikidata_id, poster_path helyett director
create table public.votes (
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
-- Szandekosan nincs policy. Minden hozzaferes a ket fuggvenyen at megy.

create index votes_wikidata_id_idx on public.votes (wikidata_id);
create index votes_ip_hash_idx on public.votes (ip_hash);

-- 3. Szavazas
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

  if p_wikidata_id is null or p_wikidata_id !~ '^Q[0-9]+$' then
    return json_build_object('statusz', 'nincs_nyitva');
  end if;

  select vote_start, vote_end into v_start, v_end
  from public.vote_settings
  where id;

  if v_start is null or now() < v_start or now() > v_end then
    return json_build_object('statusz', 'nincs_nyitva');
  end if;

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

-- 4. Toplista
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
