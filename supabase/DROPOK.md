# Dropok felvitele

A drop egy `drop` típusú ajánlat az `offers` táblában: fix időpontban
indul, korlátozott darabszámmal, fiókonként egyszer igényelhető, és az
igényléstől 7 napig váltható be. A /drop/ oldal és a főoldali drop-kártya
magától mutatja, deploy nem kell.

## A leggyorsabb: SQL Editor

Supabase → **sidequest** projekt → **SQL Editor**. Másold be, írd át a
négy jelölt sort, és futtasd:

```sql
insert into public.offers
  (nev, tipus, partner_slug, szoveg, jelveny, mod, keret, ervenyes_nap, drop_kezdes, drop_vege)
values (
  'sugar-bowling-drop-2026-11-12',      -- egyedi név: partner + dátum
  'drop',
  'sugar-bowling',                      -- a partner azonosítója
  'Ingyen pálya 1 órára',               -- amit a látogató lát
  'FREE',                               -- jelvény (max 8 karakter), vagy null
  'helyszini',                          -- 'helyszini' vagy 'online_kod'
  15,                                   -- darabszám
  7,                                    -- ennyi napig váltható be
  '2026-11-12 19:30 Europe/Budapest',   -- kezdés, budapesti idő
  '2026-11-12 23:59 Europe/Budapest'    -- vége, budapesti idő
);
```

Az időpontot így, a `Europe/Budapest` utótaggal írd, akkor a téli és a
nyári időszámítás is jó lesz.

## Table Editorból

**Table Editor → offers → Insert → Insert row.** Ugyanezeket a mezőket
töltsd ki. A `drop_kezdes` és a `drop_vege` mezőnél figyelj: a Table
Editor UTC-ben érti az időt, ha nem adsz meg időzónát. Télen a budapesti
19:30 az `18:30+00`, nyáron `17:30+00`. Ezért egyszerűbb az SQL.

## Online partnernél

Ha a `mod` `online_kod`, a user igényléskor rögtön kódot kap a kódbankból.
Előtte tölts fel legalább annyi `drop` típusú kódot, ahány darab a drop
(lásd `KODOK-FELTOLTESE.md`). Kód nélkül a drop azonnal „Elfogyott”.

## Ellenőrzés

```sql
select nev, szoveg, keret, public.ajanlat_szabad(id) as szabad,
       drop_kezdes at time zone 'Europe/Budapest' as kezdes_bp,
       drop_vege at time zone 'Europe/Budapest' as vege_bp
from public.offers
where tipus = 'drop'
order by drop_kezdes desc;
```

## Jó tudni

- A lezárt drop még 7 napig látszik a /drop/ oldalon („Elfogyott X perc
  alatt” vagy „Lezárult”), utána eltűnik.
- Ha egy dropot vissza kell vonni, állítsd az `aktiv` mezőt `false`-ra.
  Törölni csak akkor lehet, ha még senki nem igényelte.
- Az igénylés és a beváltás szabályait az adatbázis kényszeríti ki
  (`supabase/drop.sql`), nem a weboldal.
