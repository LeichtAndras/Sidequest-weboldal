-- =====================================================================
-- GENERALT FAJL, ne kezzel ird. Forras: src/data/partners.json
-- Ujrageneralas: npm run partnerek-sql
-- Futtasd a Supabase SQL Editorban, a supabase/bevaltas.sql UTAN.
-- Meglevo adatbazisnal a supabase/ajandek.sql UTAN (az veszi ki a
-- regi welcome_pct oszlopot).
-- =====================================================================

insert into public.partners (slug, name, normal_pct, mode, allowed_days)
values
  ('sugar-bowling', 'Sugár Bowling', 10, 'helyszini', null),
  ('magic-rooms', 'Magic Rooms', 25, 'helyszini', array[1,2,3,4,5]),
  ('sugarmozi', 'SugárMozi', 20, 'helyszini', null),
  ('timeheist', 'TimeHeist', 20, 'helyszini', null),
  ('szelfimuzeum', 'Szelfimúzeum', 15, 'helyszini', null),
  ('baltadobalas', 'Baltadobálás', 10, 'helyszini', null),
  ('leonoria-kvizbox', 'Leonoria Kvízbox', 10, 'helyszini', null),
  ('base-bar', 'Base Bar', 10, 'helyszini', null),
  ('pixity', 'Pixity', 10, 'online_kod', null),
  ('yoaron', 'Yoáron', 10, 'helyszini', null),
  ('rage-room-budapest', 'Rage Room Budapest', 10, 'online_kod', null)
on conflict (slug) do update set
  name = excluded.name,
  normal_pct = excluded.normal_pct,
  mode = excluded.mode,
  allowed_days = excluded.allowed_days,
  active = true,
  updated_at = now();

-- A JSON-bol kikerult partnert nem toroljuk (a beváltásai megmaradnak), csak kikapcsoljuk
update public.partners set active = false, updated_at = now()
where slug not in ('sugar-bowling', 'magic-rooms', 'sugarmozi', 'timeheist', 'szelfimuzeum', 'baltadobalas', 'leonoria-kvizbox', 'base-bar', 'pixity', 'yoaron', 'rage-room-budapest');
