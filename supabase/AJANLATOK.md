# Ajánlatok kezelése

Az ajánlatok a Supabase-ben vannak: **sidequest** projekt → **Table Editor**
→ **offers**. Itt írod át a szöveget, a keretet, vagy veszel fel újat.
Deploy nem kell hozzá, az oldal a következő betöltéskor már az újat mutatja.

## Oszlopok

| Oszlop | Mit írj bele |
|---|---|
| `nev` | Belső azonosító, egyedi. Pl. `sugar-bowling-alap`. A tesztek `PROBA-` kezdetűek. |
| `tipus` | `alap`, `welcome` vagy `drop` |
| `partner_slug` | A partner azonosítója, pl. `sugar-bowling` (a `partners` táblából) |
| `szoveg` | Amit a látogató lát, pl. `2 jegy 1 áráért`, `−5 000 Ft a foglalásból`. Legfeljebb 80 karakter. |
| `jelveny` | Rövid felirat a kártya sarkába, pl. `−20%`, `2=1`. Legfeljebb 8 karakter. Ha üres, nincs robbanás. |
| `mod` | `helyszini` (a pultnál, teljes képernyővel) vagy `online_kod` (kód a kódbankból) |
| `keret` | Alap és welcome: ennyi darab jár havonta. Drop: összesen ennyi. |
| `napi_limit` | Csak alapnál: egy user egy nap ennyiszer válthatja be ennél a partnernél (általában 1) |
| `ervenyes_nap` | Az igényelt kód ennyi napig érvényes (welcome 14, drop 7) |
| `napok` | Ha csak bizonyos napokon jó: pl. `{1,2,3,4,5}` = hétfőtől péntekig. Üres: minden nap. |
| `drop_kezdes`, `drop_vege` | Csak dropnál kötelező, máshol üres |
| `aktiv` | Kikapcsolva nem látszik és nem igényelhető |

Egy partnernek egyszerre egy aktív `alap` ajánlata lehet.

## Keret

- **alap** és **welcome**: minden hónap 1-jén magától újraindul (budapesti
  idő szerint). Nem kell semmit nullázni: a rendszer mindig az aktuális
  hónap igényléseit számolja.
- **welcome**: a lejárt, be nem váltott igénylés visszakerül a keretbe.
- **drop**: egyszeri, nem indul újra.
- **online_kod** módnál a szabad darabot a feltöltött kódok száma is
  korlátozza (lásd `KODOK-FELTOLTESE.md`).

## Tesztelő

A `profiles` táblában a `tesztelo` oszlop. Aki tesztelő, az élesítés előtt
is használhatja az új rendszert minden partnernél. Csak itt, a dashboardon
állítható; a felhasználó a saját profilját nem írhatja.

## Tesztadatok törlése

```sql
delete from public.claims where offer_id in (select id from public.offers where nev like 'PROBA-%');
delete from public.offers where nev like 'PROBA-%';
delete from public.code_pool where partner_slug like 'proba-%';
delete from public.partners where slug like 'proba-%';
```
