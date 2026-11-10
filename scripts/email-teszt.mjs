/**
 * Proba: a ket belepo e-mail (supabase/email/) kikuldese a Resend API-val,
 * pontosan azzal a feladoval, targgyal es HTML-lel, amit a Supabase kuldene,
 * csak kamu koddal. A Supabase sablonjai kozben valtozatlanok maradnak.
 *
 * A Resend kulcsot csak kornyezeti valtozobol olvassa, sehova nem irja:
 *
 *   read -s "K?Resend API kulcs: "; echo; RESEND_API_KEY=$K node scripts/email-teszt.mjs; unset K
 *
 * Cimzett: az elso argumentum, alapbol leicht.andras@gmail.com.
 */
import { readFileSync } from 'node:fs'

const KULCS = process.env.RESEND_API_KEY
if (!KULCS) {
  console.error('Hianyzik a RESEND_API_KEY. Lasd a fajl elejet.')
  process.exit(1)
}

const cimzett = process.argv[2] ?? 'leicht.andras@gmail.com'
const FELADO = 'SideQuest <noreply@sidequestbp.hu>'

const levelek = [
  { fajl: 'regisztracio.html', targy: '{{ .Token }} a kódod 🔑', kod: '596466' },
  { fajl: 'belepes.html', targy: '{{ .Token }} a belépőkódod', kod: '597197' },
]

for (const { fajl, targy, kod } of levelek) {
  const html = readFileSync(new URL(`../supabase/email/${fajl}`, import.meta.url), 'utf8')
  const valasz = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KULCS}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FELADO,
      to: [cimzett],
      subject: targy.replace('{{ .Token }}', kod),
      html: html.replaceAll('{{ .Token }}', kod),
    }),
  })
  const adat = await valasz.json().catch(() => ({}))
  console.log(
    valasz.ok
      ? `Elkuldve: ${fajl} -> ${cimzett}, targy: "${targy.replace('{{ .Token }}', kod)}" (id: ${adat.id})`
      : `HIBA ${valasz.status} (${fajl}): ${JSON.stringify(adat)}`,
  )
}
