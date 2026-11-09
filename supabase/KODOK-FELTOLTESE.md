# Online kódok feltöltése havonta (CSV)

A Pixity és a Rage Room Budapest (és minden `online_kod` módú partner)
személyes kódokat oszt. A kódokat a partner adja, te töltöd fel a
`code_pool` táblába.

- **`normal`**: az alap kedvezmény kódja. Egy user egy partnertől naponta
  legfeljebb egyet kap (`napi_limit`), a havi keret erejéig.
- **`drop`**: dropok kódjai (lásd a 4. fázist).
- **`welcome`**: üdvözlő kód. Csak az kapja, aki ezt a partnert választotta
  üdvözlő ajándéknak (welcome ajánlat az `offers` táblában, lásd `AJANLATOK.md`).
  Online partnernél annyi ajándék választható, ahány szabad `welcome` kód
  van fent, ezért ha ajánlatot indítasz egy online partnerhez, előbb töltsd
  fel hozzá a kódokat.

## 1. A CSV fájl

Egy sor egy kód. Az első sor a fejléc, pontosan ezekkel a nevekkel:

```csv
partner_slug,code,tipus,valid_until
pixity,PIX-7K2M9Q,normal,2026-12-31
pixity,PIX-W4R8TZ,normal,2026-12-31
pixity,PIX-WELC01,welcome,2027-03-31
rage-room-budapest,RAGE-55KQ,normal,2026-12-31
```

| Oszlop | Mit írj bele |
|---|---|
| `partner_slug` | `pixity` vagy `rage-room-budapest`, pontosan így |
| `code` | maga a kód, amit a partner adott |
| `tipus` | `welcome` (üdvözlő kód) vagy `normal` (havi kód) |
| `valid_until` | az utolsó nap, amikor a kód még jó, `ÉÉÉÉ-HH-NN` alakban. Üresen is hagyhatod. |

Az `id`, `assigned_to`, `assigned_at` és `created_at` oszlopokat **ne** tedd
bele, ezeket az adatbázis tölti ki.

Ha a partner csak egyféle kódot ad, csak azt töltsd fel. Ha nincs üdvözlő
kód, ennél a partnernél nem lehet üdvözlő ajándékot választani, a havi kód
ettől még működik.

Excelből vagy Google Táblázatból: **Fájl → Letöltés → CSV**.

## 2. Feltöltés

1. Supabase → a **sidequest** projekt → bal oldalt **Table Editor**
2. Válaszd ki a **code_pool** táblát
3. Fent **Insert → Import data from CSV**
4. Húzd be a fájlt. Az előnézetben nézd meg, hogy a négy oszlop jó helyre
   került-e.
5. **Import data**

Ugyanaz a kód ugyanannál a partnernél kétszer nem kerülhet be: ha a CSV-ben
olyan van, ami már fent van, az importálás hibát jelez, és semmi nem kerül
be. Ilyenkor vedd ki a duplikált sorokat, és próbáld újra.

## 3. Ellenőrzés

SQL Editorban:

```sql
select partner_slug, tipus,
       count(*) filter (where assigned_at is null) as szabad,
       count(*) filter (where assigned_at is not null) as kiosztva
from public.code_pool
group by partner_slug, tipus
order by partner_slug, tipus;
```

Ha egy partnernél a `szabad` 0, a usereknél az jelenik meg, hogy
„Erre a hónapra elfogytak a kódok”.

## Jó tudni

- Lejárt kódot (`valid_until` a mai napnál korábbi) a rendszer nem oszt ki.
- Ha egy user törli a fiókját, a kódja nem kerül vissza a bankba, mert
  lehet, hogy már felhasználta.
