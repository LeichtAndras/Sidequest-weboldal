/**
 * A partnereket irja at az adatbazisba a src/data/partners.json-bol: nev,
 * beváltási mod, nyitvatartasi napok es az uj rendszer kapcsoloja
 * (ujBevaltas). Ez a script SQL-t keszit, amit a Supabase SQL Editorban
 * kell lefuttatni. A szerver az uj_bevaltas oszlopot is ellenorzi, ezert a
 * kapcsolo atallitasa utan ezt futtasd.
 *
 * A kedvezmenyek (szoveg, keret) nem itt vannak, hanem az offers tablaban,
 * lasd supabase/AJANLATOK.md.
 *
 * Futtatas: npm run partnerek-sql  ->  supabase/partnerek.sql
 */
import { readFileSync, writeFileSync } from 'node:fs'

const partnerek = JSON.parse(readFileSync('src/data/partners.json', 'utf8'))

const sql = (s) => `'${String(s).replace(/'/g, "''")}'`

const sorok = partnerek.map((p) => {
  const mod = p.redemptionMode ?? 'helyszini'
  if (!['helyszini', 'online_kod'].includes(mod)) throw new Error(`Hibas redemptionMode (${p.slug}): ${mod}`)
  const napok = Array.isArray(p.openDays) && p.openDays.length > 0 ? `array[${p.openDays.join(',')}]` : 'null'
  const uj = p.ujBevaltas === true ? 'true' : 'false'
  return `  (${sql(p.slug)}, ${sql(p.name)}, ${sql(mod)}, ${napok}, ${uj})`
})

const kimenet = `-- =====================================================================
-- GENERALT FAJL, ne kezzel ird. Forras: src/data/partners.json
-- Ujrageneralas: npm run partnerek-sql
-- Futtasd a Supabase SQL Editorban, a supabase/bevaltas.sql es a
-- supabase/ajanlatok.sql UTAN (az hozza letre az uj_bevaltas oszlopot).
-- =====================================================================

insert into public.partners (slug, name, mode, allowed_days, uj_bevaltas)
values
${sorok.join(',\n')}
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
  and slug not in (${partnerek.map((p) => sql(p.slug)).join(', ')});
`

writeFileSync('supabase/partnerek.sql', kimenet)
console.log(`supabase/partnerek.sql kesz, ${partnerek.length} partner.`)
