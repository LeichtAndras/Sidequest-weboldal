-- =====================================================================
-- GENERALT FAJL, ne kezzel ird. Forras: src/data/partners.json
-- Ujrageneralas: npm run partnerek-sql
-- Futtasd a Supabase SQL Editorban, a supabase/bevaltas.sql es a
-- supabase/ajanlatok.sql UTAN (az hozza letre az uj_bevaltas oszlopot).
-- =====================================================================

insert into public.partners (slug, name, mode, allowed_days, uj_bevaltas)
values
  ('sugar-bowling', 'Sugár Bowling', 'helyszini', null, false),
  ('magic-rooms', 'Magic Rooms', 'helyszini', array[1,2,3,4,5], false),
  ('sugarmozi', 'SugárMozi', 'helyszini', null, false),
  ('timeheist', 'TimeHeist', 'helyszini', null, false),
  ('szelfimuzeum', 'Szelfimúzeum', 'helyszini', null, false),
  ('baltadobalas', 'Baltadobálás', 'helyszini', null, false),
  ('leonoria-kvizbox', 'Leonoria Kvízbox', 'helyszini', null, false),
  ('base-bar', 'Base Bar', 'helyszini', null, false),
  ('pixity', 'Pixity', 'online_kod', null, false),
  ('yoaron', 'Yoáron', 'helyszini', null, false),
  ('rage-room-budapest', 'Rage Room Budapest', 'online_kod', null, false)
on conflict (slug) do update set
  name = excluded.name,
  mode = excluded.mode,
  allowed_days = excluded.allowed_days,
  uj_bevaltas = excluded.uj_bevaltas,
  active = true,
  updated_at = now();

-- A JSON-bol kikerult partnert nem toroljuk (a beváltásai megmaradnak), csak kikapcsoljuk.
-- A proba- teszt partnerek nincsenek a JSON-ban, azokhoz nem nyulunk.
update public.partners set active = false, updated_at = now()
where slug not like 'proba-%'
  and slug not in ('sugar-bowling', 'magic-rooms', 'sugarmozi', 'timeheist', 'szelfimuzeum', 'baltadobalas', 'leonoria-kvizbox', 'base-bar', 'pixity', 'yoaron', 'rage-room-budapest');
