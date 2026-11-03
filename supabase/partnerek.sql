-- =====================================================================
-- GENERALT FAJL, ne kezzel ird. Forras: src/data/partners.json
-- Ujrageneralas: npm run partnerek-sql
-- Futtasd a Supabase SQL Editorban, a supabase/bevaltas.sql UTAN.
-- =====================================================================

insert into public.partners (slug, name, welcome_pct, normal_pct, mode, allowed_days)
values
  ('sugar-bowling', 'Sugár Bowling', 40, 10, 'helyszini', null),
  ('magic-rooms', 'Magic Rooms', 40, 25, 'helyszini', array[1,2,3,4,5]),
  ('sugarmozi', 'SugárMozi', 40, 20, 'helyszini', null),
  ('timeheist', 'TimeHeist', 40, 20, 'helyszini', null),
  ('szelfimuzeum', 'Szelfimúzeum', 40, 15, 'helyszini', null),
  ('baltadobalas', 'Baltadobálás', 40, 10, 'helyszini', null),
  ('leonoria-kvizbox', 'Leonoria Kvízbox', 40, 10, 'helyszini', null),
  ('base-bar', 'Base Bar', 40, 10, 'helyszini', null),
  ('pixity', 'Pixity', 40, 10, 'online_kod', null),
  ('yoaron', 'Yoáron', 40, 10, 'helyszini', null),
  ('rage-room-budapest', 'Rage Room Budapest', 40, 10, 'online_kod', null)
on conflict (slug) do update set
  name = excluded.name,
  welcome_pct = excluded.welcome_pct,
  normal_pct = excluded.normal_pct,
  mode = excluded.mode,
  allowed_days = excluded.allowed_days,
  active = true,
  updated_at = now();

-- A JSON-bol kikerult partnert nem toroljuk (a beváltásai megmaradnak), csak kikapcsoljuk
update public.partners set active = false, updated_at = now()
where slug not in ('sugar-bowling', 'magic-rooms', 'sugarmozi', 'timeheist', 'szelfimuzeum', 'baltadobalas', 'leonoria-kvizbox', 'base-bar', 'pixity', 'yoaron', 'rage-room-budapest');
