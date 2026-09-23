import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const gyoker = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(gyoker, 'dist')
const SITE_URL = 'https://sidequestbp.hu'

const KEZDET = '<!-- MEGOSZTAS ELEJE'
const VEG = '<!-- MEGOSZTAS VEGE -->'

const partners = JSON.parse(readFileSync(join(gyoker, 'src/data/partners.json'), 'utf8'))
const alap = readFileSync(join(dist, 'index.html'), 'utf8')

const eleje = alap.indexOf(KEZDET)
const vege = alap.indexOf(VEG)
if (eleje === -1 || vege === -1) {
  throw new Error('Nincs meg a megosztas jelolo az index.html-ben, a partner oldalak nem keszultek el.')
}

/** HTML attributumba irhato szoveg. */
const esc = (szoveg) =>
  String(szoveg)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function metaBlokk(partner) {
  const url = `${SITE_URL}/${partner.slug}/`
  const kep = partner.image ? `${SITE_URL}${partner.image}` : `${SITE_URL}/sidequest-logo.png`
  const cim = `${partner.name}: ${partner.discount} kedvezmény | SideQuest`
  const leiras =
    partner.description?.trim() ||
    `${partner.name} ${partner.discount} kedvezménnyel, SideQuest-tel. ${partner.redeem}.`

  return [
    `<title>${esc(cim)}</title>`,
    `<meta name="description" content="${esc(leiras)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="SideQuest" />`,
    `<meta property="og:locale" content="hu_HU" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(`${partner.name} ${partner.discount} kedvezmény`)}" />`,
    `<meta property="og:description" content="${esc(leiras)}" />`,
    `<meta property="og:image" content="${kep}" />`,
    `<meta property="og:image:alt" content="${esc(partner.name)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(`${partner.name} ${partner.discount} kedvezmény`)}" />`,
    `<meta name="twitter:description" content="${esc(leiras)}" />`,
    `<meta name="twitter:image" content="${kep}" />`,
  ]
    .map((sor) => `    ${sor}`)
    .join('\n')
}

let db = 0
for (const partner of partners) {
  if (!partner.slug) throw new Error(`Hianyzo slug: ${partner.name}`)
  const oldal = alap.slice(0, eleje) + metaBlokk(partner).trimStart() + '\n    ' + alap.slice(vege + VEG.length)
  const mappa = join(dist, partner.slug)
  mkdirSync(mappa, { recursive: true })
  writeFileSync(join(mappa, 'index.html'), oldal)
  db++
}

// Ismeretlen cimre is a weboldal joj jon be, ne a GitHub hibaoldala.
writeFileSync(join(dist, '404.html'), alap)

console.log(`Partner oldalak: ${db} db, plusz a 404.html`)
