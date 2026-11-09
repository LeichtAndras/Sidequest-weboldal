-- =====================================================================
-- SideQuest statisztika, 5. fazis. Csak olvas, semmit nem modosit.
--
-- Hasznalat: Supabase -> sidequest projekt -> SQL Editor. Masold be az
-- egeszet, jelold ki az egyik lekerdezest (az elejetol a pontosvesszoig),
-- es nyomd meg a Run gombot. Kijeloles nelkul csak az utolso eredmenye
-- latszik.
--
-- Minden datum budapesti ido szerint szamol. A PROBA- teszt ajanlatokat es
-- partnereket kihagyja.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Regisztraciok naponta
--    regisztralt:     kitoltotte a profilt (nev, 16 ev, adatkezeles)
--    nem_fejezte_be:  kert belepo kodot, de nem jutott el a profilig
--    osszesen:        addig a napig az osszes regisztralt
-- ---------------------------------------------------------------------
with napok as (
  select
    (u.created_at at time zone 'Europe/Budapest')::date as nap,
    count(*) as belepett,
    count(p.id) as regisztralt
  from auth.users u
  left join public.profiles p on p.id = u.id
  where not coalesce(u.is_anonymous, false)
  group by 1
)
select
  nap,
  regisztralt,
  belepett - regisztralt as nem_fejezte_be,
  sum(regisztralt) over (order by nap) as osszesen
from napok
order by nap desc;


-- ---------------------------------------------------------------------
-- 2. Igenylesek es bevaltasok ajanlatonkent, tipusonkent, havonta
--    igenyles:  ennyiszer igenyeltek (alapnal az igenyles = bevaltas)
--    bevaltva:  ebbol beváltva (online kodnal a kod kiadasa a beváltás)
--    aktiv:     igenyelt, meg bevalthato
--    lejart:    igenyelt, nem valtotta be idoben
-- ---------------------------------------------------------------------
select
  to_char(c.igenyelve at time zone 'Europe/Budapest', 'YYYY-MM') as honap,
  o.tipus,
  p.name as partner,
  o.szoveg as ajanlat,
  count(*) as igenyles,
  count(*) filter (where c.bevaltva is not null) as bevaltva,
  count(*) filter (where c.bevaltva is null and c.lejarat > now()) as aktiv,
  count(*) filter (where c.bevaltva is null and c.lejarat <= now()) as lejart,
  count(distinct c.user_id) as kulonbozo_user
from public.claims c
join public.offers o on o.id = c.offer_id
join public.partners p on p.slug = c.partner_slug
where o.nev not like 'PROBA-%'
group by 1, 2, 3, 4
order by 1 desc, 2, igenyles desc;


-- ---------------------------------------------------------------------
-- 3. Tipusonkent havonta, osszesitve (gyors attekintes)
-- ---------------------------------------------------------------------
select
  to_char(c.igenyelve at time zone 'Europe/Budapest', 'YYYY-MM') as honap,
  o.tipus,
  count(*) as igenyles,
  count(*) filter (where c.bevaltva is not null) as bevaltva,
  count(distinct c.user_id) as kulonbozo_user
from public.claims c
join public.offers o on o.id = c.offer_id
where o.nev not like 'PROBA-%'
group by 1, 2
order by 1 desc, 2;


-- ---------------------------------------------------------------------
-- 4. Dropok: mennyi ido alatt fogytak el
--    elfogyott_perc: az utolso igenyles ideje minusz a kezdes, ha elfogyott
--    allapot:        kozelgo / elo / elfogyott / lezarult (nem fogyott el)
-- ---------------------------------------------------------------------
select
  p.name as partner,
  o.szoveg as drop_ajanlat,
  o.drop_kezdes at time zone 'Europe/Budapest' as kezdes,
  o.drop_vege at time zone 'Europe/Budapest' as vege,
  o.keret,
  count(c.id) as igenyles,
  count(c.id) filter (where c.bevaltva is not null) as bevaltva,
  case when count(c.id) >= o.keret
    then round((extract(epoch from (max(c.igenyelve) - o.drop_kezdes)) / 60.0)::numeric, 1)
  end as elfogyott_perc,
  case
    when now() < o.drop_kezdes then 'kozelgo'
    when count(c.id) >= o.keret then 'elfogyott'
    when now() < o.drop_vege then 'elo'
    else 'lezarult'
  end as allapot
from public.offers o
join public.partners p on p.slug = o.partner_slug
left join public.claims c on c.offer_id = o.id
where o.tipus = 'drop' and o.nev not like 'PROBA-%'
group by o.id, p.name
order by o.drop_kezdes desc;


-- ---------------------------------------------------------------------
-- 5. Maradek keret ajanlatonkent
--    alap es welcome: ebben a honapban (minden honap 1-jen ujraindul);
--    drop: osszesen. Online partnernel a szabad kodok szama is korlatozza.
-- ---------------------------------------------------------------------
select
  o.tipus,
  p.name as partner,
  o.szoveg as ajanlat,
  o.keret,
  public.ajanlat_felhasznalt(o.id) as felhasznalt,
  public.ajanlat_szabad(o.id) as szabad,
  o.aktiv
from public.offers o
join public.partners p on p.slug = o.partner_slug
where o.nev not like 'PROBA-%'
order by o.aktiv desc, o.tipus, p.name;


-- ---------------------------------------------------------------------
-- 6. Kodbank partnerenkent (online partnerek)
--    szabad:          meg kioszthato, nem jart le
--    kiosztva_ehavi:  ebben a honapban kiosztott
--    lejart_szabad:   senki nem kapta meg, de mar lejart
-- ---------------------------------------------------------------------
with ma as (
  select
    (now() at time zone 'Europe/Budapest')::date as nap,
    date_trunc('month', now() at time zone 'Europe/Budapest')
      at time zone 'Europe/Budapest' as honap_eleje
)
select
  pa.name as partner,
  t.tipus,
  count(c.id) filter (
    where c.assigned_at is null and (c.valid_until is null or c.valid_until >= ma.nap)
  ) as szabad,
  count(c.id) filter (where c.assigned_at >= ma.honap_eleje) as kiosztva_ehavi,
  count(c.id) filter (where c.assigned_at is not null) as kiosztva_osszes,
  count(c.id) filter (where c.assigned_at is null and c.valid_until < ma.nap) as lejart_szabad
from public.partners pa
cross join (values ('normal'), ('welcome'), ('drop')) as t (tipus)
cross join ma
left join public.code_pool c on c.partner_slug = pa.slug and c.tipus = t.tipus
where pa.mode = 'online_kod' and pa.active and pa.slug not like 'proba-%'
group by pa.name, t.tipus
order by pa.name, t.tipus;
