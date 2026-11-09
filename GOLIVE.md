# Élesítés előtti ellenőrzőlista

Az új kedvezményrendszer (alap / welcome / drop) élesítése előtt ezeket kell
kitakarítani vagy átállítani. Ha teszteléshez új adat kerül az adatbázisba,
ide is fel kell írni.

Az élő oldal (sidequestbp.hu) ugyanazt a Supabase projektet használja
(`sidequest`, `qkmzf…`), mint a fejlesztés. Ami itt van, az éles adatbázis.

## 0. Szabályok, amíg nincs élesítés

- **Push csak a user kifejezett engedélyével.** A push azonnal élesít
  (GitHub Pages deploy).
- **Az élő oldalon semmi új nem látszhat**, amíg a user nem mondja.
- **`?uj=1` az élő oldalon csak belépett tesztelőnek működik**
  (`profiles.tesztelo = true`). Fejlesztői szerveren (`npm run dev`,
  localhost) mindenkinek. Mindenki más az élő oldalon `?uj=1`-gyel is a
  régi oldalt kapja. (Lásd `src/fiok/kapcsolo.ts`.) A tesztelő a
  `/fiokom/` oldalon lép be.
- **Kikapcsolt `ujBevaltas` mellett az élő oldalon:** nincs regisztrációs
  popup, nincs drop-kártya, nincs „Drop” pirula, nincs új jelvény vagy
  gomb, és a sima látogató böngészője nem hívja a Supabase-t.

### Minden push előtt: bizonyíték a usernek

A push előtt meg kell mutatni:

- [ ] `npm run build` kimenete, hiba nélkül.
- [ ] Az előrenderelt HTML-ben (`dist/index.html`, egy partneroldal) nincs
      új elem: `grep -c "fiok-pirula\|bev-blokk\|fiok-retes\|drop-" dist/index.html` → 0.
- [ ] Az éles buildet nem-localhost címen kiszolgálva (pl. a gép LAN címén,
      `vite preview --host`), kijelentkezett látogatóként:
      - `?uj=1` nélkül: régi oldal, nincs Supabase-kérés.
      - `?uj=1`-gyel: ugyanúgy régi oldal, nincs Supabase-kérés.
      - Képernyőkép mindkettőről.
- [ ] Belépett tesztelőként `?uj=1`-gyel az új rendszer látszik.

## 1. Tesztadatok törlése (Supabase SQL Editor)

- [ ] Teszt-igénylések. Élesítés előtt minden igénylés teszt, ezért az egész
      tábla üríthető. A kódbankban a hozzájuk rendelt kódokat is vissza kell
      állítani, vagy a PROBA-kódokkal együtt törölni (lásd lent):
      ```sql
      delete from public.claims;
      ```
- [ ] PROBA- ajánlatok és a teszt partnerek (`proba-hely`, `proba-online`):
      ```sql
      delete from public.claims where offer_id in (select id from public.offers where nev like 'PROBA-%');
      delete from public.offers where nev like 'PROBA-%';
      delete from public.code_pool where partner_slug like 'proba-%';
      delete from public.partners where slug like 'proba-%';
      ```
- [ ] PROBA- kódok a valódi partnereknél (2026-11-09: `PROBA-RAGE-1`,
      `PROBA-RAGE-2` a Rage Roomnál):
      ```sql
      delete from public.code_pool where code like 'PROBA-%';
      ```
- [x] A párhuzamos teszt dropja (`PROBA-drop-parhuzamos`, 2026-11-09) és az
      igénylései: a teszt után azonnal törölve.
- [ ] Teszt felhasználók. Most egy fiók van: leicht.andras@gmail.com
      (tesztelő, megmarad). A 4. fázis párhuzamos tesztje 30 anonim
      felhasználót hozott létre; 2026-11-09-én a teszt után törölve
      (ellenőrizve: 0 maradt). Élesítés előtt újra ellenőrizd:
      ```sql
      delete from auth.users where is_anonymous;
      ```
- [ ] Ellenőrzés: ezeknek 0-t kell adniuk:
      ```sql
      select (select count(*) from public.offers where nev like 'PROBA-%') as proba_ajanlat,
             (select count(*) from public.code_pool where code like 'PROBA-%') as proba_kod,
             (select count(*) from public.partners where slug like 'proba-%') as proba_partner,
             (select count(*) from auth.users where is_anonymous) as anonim_user;
      ```

## 2. Beállítások

- [ ] Anonim belépés KIKAPCSOLVA (Authentication → Sign In / Providers →
      „Allow anonymous sign-ins”). 2026-11-09: a párhuzamos teszthez be-,
      utána ki lett kapcsolva; kívülről ellenőrizve
      (`anonymous_provider_disabled`). Élesítés előtt újra ellenőrizd.
- [ ] A tesztelők listája rendben (`profiles.tesztelo`). A tesztelő
      élesítés előtt is mindent lát; élesen ez nem zavar, de nézd át, ki az.

## 3. Valódi ajánlatok és kódok

- [ ] Az alap ajánlatok kerete helykitöltő (100). Írd át a valódira
      (`offers.keret`), és nézd át a szövegeket és a jelvényeket.
- [ ] A welcome ajánlatok (Sugár Bowling, TimeHeist, Rage Room, 40%, havi 10)
      helykitöltők.
- [ ] Online partnereknél (Pixity, Rage Room) valódi `normal` és `welcome`
      kódok a kódbankban. Kód nélkül a keret 0, „Elfogyott” látszik.
- [ ] A Pixity foglalási linkje (`bookingUrl` a `partners.json`-ban) hiányzik.
- [ ] Az első valódi dropok felvitele.

## 4. Régi rendszer maradványai

- [ ] A régi ajándékrendszer táblái és függvényei törölve (a 3. fázis,
      2026-11-09, `supabase/welcome.sql` eldobta, ellenőrizve): `welcome_offers`, `welcome_claims`, `ajandek_lista`, `ajandekom`,
      `ajandek_valasztasa`. Ellenőrzés:
      ```sql
      select to_regclass('public.welcome_offers'), to_regclass('public.welcome_claims'),
             to_regprocedure('public.ajandek_lista()'), to_regprocedure('public.ajandekom()'),
             to_regprocedure('public.ajandek_valasztasa(bigint)');
      ```
- [x] A `supabase/ajandek.sql` és a régi `src/fiok/ajanlatok.ts` törölve a
      repóból (3. fázis).
- [ ] Döntés a régi QR-lépésekről és a közös `SIDEQUEST10` kódról a
      kártyákon (most még látszanak, a user szerint „még ne” vegyük ki).

## 5. Szövegek

- [ ] Adatkezelési tájékoztató: a 2.2-es táblázatba az üdvözlő ajándék sora
      (melyik hely, mennyi, a választás, a határidő és a beváltás ideje;
      „hogy csak egyszer lehessen felhasználni, és a darabszám pontos
      legyen”). 2026-11-09-én a push előtt kivettük, mert az élő oldalon
      még semmi új nem látszhat; élesítéskor kell visszatenni.
- [ ] Adatkezelési tájékoztató: fióktörléskor az igénylések név nélkül
      megmaradnak (a keret miatt), nem törlődnek. A 2.2 és a 4. pontot ehhez
      kell igazítani. A drop és a „Kódjaim” adatai is kerüljenek bele.
- [ ] A hatálybalépés dátuma (`HATALYOS` a `src/Adatkezeles.tsx`-ben) az
      élesítés napja legyen.

## 6. Bekapcsolás

- [ ] A `partners.json`-ban az élesítendő partnereknél `"ujBevaltas": true`.
- [ ] `npm run partnerek-sql`, majd a `supabase/partnerek.sql` futtatása:
      a szerver is ezt a kapcsolót ellenőrzi.
- [ ] Commit, push, deploy. Az élő oldalon a jelenlegi (2026-11-03-i) build
      `?uj=1`-gyel már törölt függvényeket hív; a push ezt is rendbe teszi.
- [ ] Az élő oldalon kijelentkezve és belépve is végignézni: kártyák,
      popup, beváltás, drop, Kódjaim.
