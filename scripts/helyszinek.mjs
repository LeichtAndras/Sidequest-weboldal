/**
 * Helyszinkepek a kartyakhoz: eles, teljes kartyat kitolto foto, elmosas es
 * sotetites nelkul. Egy kep helyszinenkent, 4:3-ra vagva, ket meretben.
 *
 * A vegen a lenyilo panelbe kerulo kepek is elkeszulnek. Azokat nem vagjuk,
 * mert a rajtuk levo szoveg es logo nem eshet le a szelen.
 *
 * Futtatas: npm run helyszinek
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'

const FORRAS = 'kepek-eredeti'
const CEL = 'public/venues'
/** A kartya aranya. A kepet mar itt erre vagjuk, hogy ne toltsunk le felesleget. */
const ARANY = 4 / 3
const MERETEK = [960, 640]

/**
 * Helyszinenkent a nyers foto es a fuggoleges fokusz. A fokusz 0 = felso szel,
 * 0.5 = kozep, 1 = also szel. Ez donti el, mi marad benne a 4:3-as vagasban.
 */
const HELYSZINEK = {
  'sugar-bowling': { forras: 'sugar-bowling2.jpg', fokusz: 0.5 },
  'magic-rooms': { forras: 'magic-rooms-uj.jpg', fokusz: 0.45, fenyero: 1.12, kontraszt: 1.06 },
  'sugarmozi': { forras: 'sugarmozi-uj.jpg', fokusz: 0.45 },
  'timeheist': { forras: 'timeheist.jpg', fokusz: 0.38 },
  'szelfimuzeum': { forras: 'szelfimuzeum.jpg', fokusz: 0.42 },
  'baltadobalas': { forras: 'baltadobalas-uj.jpg', fokusz: 0.45 },
  'leonoria-kvizbox': { forras: 'leonoria-kvizbox-v2.jpg', fokusz: 0.45 },
  'base-bar': { forras: 'base-bar-v2.jpg', fokusz: 0.45 },
  'pixity': { forras: 'pixity-v2.jpg', fokusz: 0.5, fenyero: 1.18, kontraszt: 1.08 },
  // A forras mar a bekeretezett rajzrol levagott 4:3-as resz, keret es fal
  // nelkul. Az enyhe vilagositas a papir szurkeseget viszi el.
  'yoaron': { forras: 'yoaron.jpg', fokusz: 0.5, fenyero: 1.07, kontraszt: 1.04 },
}

/** 4:3-as kivagas a megadott fuggoleges fokusz korul. */
function vagas(szeles, magas, fokusz) {
  if (szeles / magas > ARANY) {
    const uj = Math.round(magas * ARANY)
    return { left: Math.round((szeles - uj) / 2), top: 0, width: uj, height: magas }
  }
  const uj = Math.round(szeles / ARANY)
  const teteje = Math.round((magas - uj) * fokusz)
  return { left: 0, top: Math.max(0, Math.min(magas - uj, teteje)), width: szeles, height: uj }
}

await mkdir(CEL, { recursive: true })

const partnerek = JSON.parse(await readFile('src/data/partners.json', 'utf8'))
const nevek = {}

for (const [slug, be] of Object.entries(HELYSZINEK)) {
  const kep = sharp(`${FORRAS}/${be.forras}`)
  const { width, height } = await kep.metadata()
  const keret = vagas(width, height, be.fokusz)

  for (const szeles of MERETEK) {
    let munka = sharp(`${FORRAS}/${be.forras}`).extract(keret).resize({
      width: szeles,
      height: Math.round(szeles / ARANY),
      fit: 'cover',
    })
    if (be.fenyero || be.kontraszt) {
      munka = munka.linear(be.kontraszt ?? 1, be.fenyero ? (be.fenyero - 1) * 90 : 0)
    }
    // Enyhe elesites, mert a kicsinyites mindig lagyit egy keveset
    const puffer = await munka.sharpen({ sigma: 0.7 }).webp({ quality: 82 }).toBuffer()
    const fajl = szeles === MERETEK[0] ? `${slug}.webp` : `${slug}-${szeles}.webp`
    await writeFile(`${CEL}/${fajl}`, puffer)
    if (szeles === MERETEK[0]) nevek[slug] = fajl
  }
  console.log(`${slug}: ${keret.width}x${keret.height} -> ${MERETEK.join(', ')}`)
}

// A fajlnev bekerul az adatokba, hogy uj helyszin egy sor legyen
let valtozott = 0
for (const partner of partnerek) {
  const fajl = nevek[partner.slug]
  if (fajl && partner.venue !== fajl) {
    partner.venue = fajl
    valtozott++
  }
}
await writeFile('src/data/partners.json', JSON.stringify(partnerek, null, 2) + '\n')
console.log(`Kesz. partners.json: ${valtozott} helyszinkep beirva.`)

/*
 * A lenyilo panel kepei. Ezeket nem vagjuk es nem tolteljuk ki: a sajat
 * aranyukban maradnak, mert rajtuk szoveg es logo is lehet, aminek a
 * szelen kellene lelognia. Csak kicsinyites megy, ket szelessegben.
 */
const PANELKEPEK = {
  'yoaron-ralph-lauren': 'yoaron-ralph-lauren.jpg',
}

const PANEL_CEL = 'public/partnerkepek'
await mkdir(PANEL_CEL, { recursive: true })

for (const [nev, forras] of Object.entries(PANELKEPEK)) {
  const { width, height } = await sharp(`${FORRAS}/${forras}`).metadata()
  for (const szeles of MERETEK) {
    const puffer = await sharp(`${FORRAS}/${forras}`)
      .resize({ width: Math.min(szeles, width), withoutEnlargement: true })
      .sharpen({ sigma: 0.6 })
      .webp({ quality: 84 })
      .toBuffer()
    const fajl = szeles === MERETEK[0] ? `${nev}.webp` : `${nev}-${szeles}.webp`
    await writeFile(`${PANEL_CEL}/${fajl}`, puffer)
  }
  console.log(`panelkep ${nev}: ${width}x${height} (${(width / height).toFixed(2)}:1) -> ${MERETEK.join(', ')}`)
}
