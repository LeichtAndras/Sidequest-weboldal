-- =====================================================================
-- SideQuest statisztika, 4. fazis. Csak olvas, semmit nem modosit.
--
-- Hasznalat: Supabase -> sidequest projekt -> SQL Editor. Masold be az
-- egeszet, jelold ki az egyik lekerdezest (az elejetol a pontosvesszoig),
-- es nyomd meg a Run gombot. Kijeloles nelkul csak az utolso eredmenye
-- latszik.
--
-- Minden datum budapesti ido szerint szamol.
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
-- 2. Bevaltasok partnerenkent es havonta
--    Helyszini partnernel egy gombnyomas egy bevaltas (az 5 percen belul
--    ujranyitott ugyanaz marad). Online partnernel egy kiosztott kod.
--    Az udvozlo oszlop a beváltott udvozlo ajandekokat szamolja.
-- ---------------------------------------------------------------------
select
  to_char(r.created_at at time zone 'Europe/Budapest', 'YYYY-MM') as honap,
  pa.name as partner,
  count(*) filter (where r.tipus = 'welcome') as udvozlo,
  count(*) filter (where r.tipus = 'normal') as normal,
  count(*) as osszesen,
  count(distinct r.user_id) as kulonbozo_user
from public.redemptions r
join public.partners pa on pa.slug = r.partner_slug
group by 1, 2
order by 1 desc, osszesen desc, partner;


-- ---------------------------------------------------------------------
-- 3. Maradek kodok partnerenkent (online partnerek)
--    szabad:            meg kioszthato, nem jart le
--    kiosztva_ehavi:    ebben a honapban kiosztott
--    kiosztva_osszes:   valaha kiosztott
--    lejart_szabad:     senki nem kapta meg, de mar lejart
--    elso_lejarat:      a szabad kodok kozul a legkorabban lejaro napja
--    A 0 szabad kodu sorok is latszanak: ott a userek azt latjak, hogy
--    "Erre a hónapra elfogytak a kódok".
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
  count(c.id) filter (where c.assigned_at is null and c.valid_until < ma.nap) as lejart_szabad,
  min(c.valid_until) filter (where c.assigned_at is null and c.valid_until >= ma.nap) as elso_lejarat
from public.partners pa
cross join (values ('welcome'), ('normal')) as t (tipus)
cross join ma
left join public.code_pool c on c.partner_slug = pa.slug and c.tipus = t.tipus
where pa.mode = 'online_kod' and pa.active
group by pa.name, t.tipus
order by pa.name, t.tipus desc;


-- ---------------------------------------------------------------------
-- 4. Udvozlo ajandekok ajanlatonkent
--    osszes:     ennyi darab van az ajanlatbol (welcome_offers.total)
--    bevaltott:  valasztottak es be is valtottak
--    aktiv:      valasztottak, a 14 nap meg nem telt le
--    lejart:     valasztottak, de nem valtottak be idoben (a darab visszakerult)
--    szabad:     meg valaszthato; online partnernel a szabad udvozlo kodok
--                szama is korlatozza
-- ---------------------------------------------------------------------
select
  p.name as partner,
  o.pct,
  o.total as osszes,
  count(c.id) filter (where c.redeemed_at is not null) as bevaltott,
  count(c.id) filter (
    where c.redeemed_at is null and c.user_id is not null and c.expires_at > now()
  ) as aktiv,
  count(c.id) filter (
    where c.redeemed_at is null and (c.expires_at <= now() or c.user_id is null)
  ) as lejart,
  public.ajanlat_szabad(o.id) as szabad,
  o.active as ajanlat_aktiv
from public.welcome_offers o
join public.partners p on p.slug = o.partner_slug
left join public.welcome_claims c on c.offer_id = o.id
group by o.id, p.name
order by o.active desc, o.pct desc, p.name;
