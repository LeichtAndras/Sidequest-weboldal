/**
 * Build utani lepes. Harom dolgot csinal:
 *  1. elorendereli az oldalt, hogy a tartalom a statikus HTML-ben is benne legyen
 *  2. legyartja a partnerenkenti megoszthato oldalakat sajat meta adatokkal
 *  3. kiirja a sitemap.xml-t a partners.json alapjan
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const gyoker = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(gyoker, 'dist')
const SITE_URL = 'https://sidequestbp.hu'

const KEZDET = '<!-- MEGOSZTAS ELEJE'
const VEG = '<!-- MEGOSZTAS VEGE -->'
const GYOKER = '<div id="root"></div>'

const partners = JSON.parse(readFileSync(join(gyoker, 'src/data/partners.json'), 'utf8'))
const moziBeallitas = JSON.parse(readFileSync(join(gyoker, 'src/data/movie-vote.json'), 'utf8'))
/** Ugyanaz a kapcsolo, mint a kliensben: hamisnal nincs /mozi oldal. */
const moziAktiv = moziBeallitas.aktiv === true
const kategoriaSzo = JSON.parse(readFileSync(join(gyoker, 'src/data/kategoriak.json'), 'utf8'))
const alap = readFileSync(join(dist, 'index.html'), 'utf8')

const eleje = alap.indexOf(KEZDET)
const vege = alap.indexOf(VEG)
if (eleje === -1 || vege === -1) {
  throw new Error('Nincs meg a megosztas jelolo az index.html-ben, a partner oldalak nem keszultek el.')
}
if (!alap.includes(GYOKER)) {
  throw new Error('Nincs meg az ures gyoker elem az index.html-ben, az elorendereles nem megy.')
}

const { render } = await import(pathToFileURL(join(gyoker, 'dist-ssr/entry-server.js')).href)

/** HTML attributumba irhato szoveg. */
const esc = (szoveg) =>
  String(szoveg)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * A kep alt szovege, ugyanaz, mint a kartyan: "Sugár Bowling, bowlingpálya
 * Budapesten". A kartya oldalan a ThumbCard kepLeiras fuggvenye adja.
 */
function kepLeiras(partner) {
  const szo = kategoriaSzo[partner.category] ?? partner.category.toLowerCase()
  return `${partner.name}, ${szo} Budapesten`
}

/**
 * A keresoben megjeleno leiras legfeljebb 155 karakter. Ha a partner szovege
 * hosszabb, az utolso olyan mondat vegen vagjuk el, ami meg belefer. Ha meg az
 * elso mondat sem fer bele, szohataron vagunk, es harom pont zarja.
 */
const LEIRAS_MAX = 155

function rovidLeiras(szoveg, max = LEIRAS_MAX) {
  const tiszta = szoveg.trim().replace(/\s+/g, ' ')
  if (tiszta.length <= max) return tiszta

  const mondatok = tiszta.match(/[^.!?]+[.!?]+(?:\s+|$)/g) ?? []
  let kesz = ''
  for (const mondat of mondatok) {
    if ((kesz + mondat).trim().length > max) break
    kesz += mondat
  }
  if (kesz.trim()) return kesz.trim()

  const vagott = tiszta.slice(0, max - 1)
  const szokoz = vagott.lastIndexOf(' ')
  return (szokoz > 0 ? vagott.slice(0, szokoz) : vagott).trim() + '…'
}

function metaBlokk(partner) {
  const url = `${SITE_URL}/${partner.slug}/`
  const kep = partner.image ? `${SITE_URL}${partner.image}` : `${SITE_URL}/sidequest-logo.png`
  const cim = `${partner.name}: ${partner.discount} kedvezmény | SideQuest`
  const leiras =
    partner.description?.trim() ||
    `${partner.name} ${partner.discount} kedvezménnyel, SideQuest-tel. ${partner.redeem}.`
  // A kereso leiras rovid, a megosztasi elonezete maradhat teljes.
  // A meta tagek egy soros ertekek, ezert a bekezdeskozoket osszevonjuk.
  const rovid = rovidLeiras(leiras)
  const egysoros = leiras.replace(/\s+/g, ' ').trim()

  return [
    `<title>${esc(cim)}</title>`,
    `<meta name="description" content="${esc(rovid)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="SideQuest" />`,
    `<meta property="og:locale" content="hu_HU" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(`${partner.name} ${partner.discount} kedvezmény`)}" />`,
    `<meta property="og:description" content="${esc(egysoros)}" />`,
    `<meta property="og:image" content="${kep}" />`,
    `<meta property="og:image:alt" content="${esc(kepLeiras(partner))}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(`${partner.name} ${partner.discount} kedvezmény`)}" />`,
    `<meta name="twitter:description" content="${esc(egysoros)}" />`,
    `<meta name="twitter:image" content="${kep}" />`,
  ]
    .map((sor) => `    ${sor}`)
    .join('\n')
}

/**
 * A filmszavazas oldal meta adatai. Kozossegi megosztasra a kozos
 * megosztasi kep megy, amig nincs sajat hero kep.
 */
function moziBlokk() {
  const url = `${SITE_URL}/mozi/`
  const cim = 'Te választod a filmet! | SideQuest Budapest'
  const leiras =
    'Szavazz, melyik filmet vetítsük a SideQuest filmesten. A legtöbb szavazatot kapott film nyer.'

  return [
    `<title>${esc(cim)}</title>`,
    `<meta name="description" content="${esc(leiras)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="SideQuest" />`,
    `<meta property="og:locale" content="hu_HU" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:title" content="${esc(cim)}" />`,
    `<meta property="og:description" content="${esc(leiras)}" />`,
    `<meta property="og:image" content="${SITE_URL}/images/mozi/og-mozi.png" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="SideQuest filmest a SugárMoziban, te választod a filmet" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(cim)}" />`,
    `<meta name="twitter:description" content="${esc(leiras)}" />`,
    `<meta name="twitter:image" content="${SITE_URL}/images/mozi/og-mozi.png" />`,
  ]
    .map((sor) => `    ${sor}`)
    .join('\n')
}

/** A kesz oldal: sajat meta blokk, es a gyoker elemben a kirajzolt tartalom. */
function oldal(utvonal, meta) {
  const fejjel = meta
    ? alap.slice(0, eleje) + meta.trimStart() + '\n    ' + alap.slice(vege + VEG.length)
    : alap
  return fejjel.replace(GYOKER, `<div id="root">${render(utvonal)}</div>`)
}

writeFileSync(join(dist, 'index.html'), oldal('/', null))

let db = 0
for (const partner of partners) {
  if (!partner.slug) throw new Error(`Hianyzo slug: ${partner.name}`)
  const mappa = join(dist, partner.slug)
  mkdirSync(mappa, { recursive: true })
  writeFileSync(join(mappa, 'index.html'), oldal(`/${partner.slug}/`, metaBlokk(partner)))
  db++
}

// Filmszavazas oldal, csak ha a vetites be van kapcsolva
if (moziAktiv) {
  mkdirSync(join(dist, 'mozi'), { recursive: true })
  writeFileSync(join(dist, 'mozi/index.html'), oldal('/mozi/', moziBlokk()))
}

// Ismeretlen cimre is a weboldal jojjon be, ne a GitHub hibaoldala.
writeFileSync(join(dist, '404.html'), oldal('/', null))

// Sitemap: a fooldal es minden partner megoszthato cime.
const ma = new Date().toISOString().slice(0, 10)
const cimek = [
  `${SITE_URL}/`,
  ...(moziAktiv ? [`${SITE_URL}/mozi/`] : []),
  ...partners.map((partner) => `${SITE_URL}/${partner.slug}/`),
]
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  cimek.map((url) => `  <url>\n    <loc>${url}</loc>\n    <lastmod>${ma}</lastmod>\n  </url>`).join('\n') +
  `\n</urlset>\n`

// A public mappaba is bekerul, igy a repoban is latszik, nem csak a buildben.
writeFileSync(join(dist, 'sitemap.xml'), sitemap)
writeFileSync(join(gyoker, 'public/sitemap.xml'), sitemap)

console.log(
  `Elorenderelve: fooldal${moziAktiv ? ' + mozi' : ''} + ${db} partner oldal + 404.html, ` +
    `sitemap: ${cimek.length} cim${moziAktiv ? '' : ' (a vetites ki van kapcsolva)'}`,
)
