/**
 * A partnerek kedvezmenyeit irja at az adatbazisba. A szamok egy helyen
 * vannak, a src/data/partners.json-ban (welcomeDiscount, discount,
 * redemptionMode, openDays). Ez a script ebbol keszit egy SQL-t, amit a
 * Supabase SQL Editorban kell lefuttatni. A beváltásnál mindig az
 * adatbazisban levo szam ervenyes, ezert valtozas utan ezt futtasd.
 *
 * Futtatas: npm run partnerek-sql  ->  supabase/partnerek.sql
 */
import { readFileSync, writeFileSync } from 'node:fs'

const partnerek = JSON.parse(readFileSync('src/data/partners.json', 'utf8'))

const szazalek = (ertek, mi, slug) => {
  const n = typeof ertek === 'number' ? ertek : Number.parseInt(String(ertek).replace(/\D/g, ''), 10)
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error(`Hibas ${mi} (${slug}): ${ertek}`)
  return n
}
const sql = (s) => `'${String(s).replace(/'/g, "''")}'`

const sorok = partnerek.map((p) => {
  const udvozlo = szazalek(p.welcomeDiscount, 'welcomeDiscount', p.slug)
  const normal = szazalek(p.discount, 'discount', p.slug)
  const mod = p.redemptionMode ?? 'helyszini'
  if (!['helyszini', 'online_kod'].includes(mod)) throw new Error(`Hibas redemptionMode (${p.slug}): ${mod}`)
  const napok = Array.isArray(p.openDays) && p.openDays.length > 0 ? `array[${p.openDays.join(',')}]` : 'null'
  return `  (${sql(p.slug)}, ${sql(p.name)}, ${udvozlo}, ${normal}, ${sql(mod)}, ${napok})`
})

const kimenet = `-- =====================================================================
-- GENERALT FAJL, ne kezzel ird. Forras: src/data/partners.json
-- Ujrageneralas: npm run partnerek-sql
-- Futtasd a Supabase SQL Editorban, a supabase/bevaltas.sql UTAN.
-- =====================================================================

insert into public.partners (slug, name, welcome_pct, normal_pct, mode, allowed_days)
values
${sorok.join(',\n')}
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
where slug not in (${partnerek.map((p) => sql(p.slug)).join(', ')});
`

writeFileSync('supabase/partnerek.sql', kimenet)
console.log(`supabase/partnerek.sql kesz, ${partnerek.length} partner.`)
