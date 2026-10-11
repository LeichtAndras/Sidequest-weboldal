import type { Partner } from '../types'

/**
 * A napi ajanlat kivalasztasa. Minden fuggveny tiszta: ugyanarra a
 * bemenetre mindig ugyanazt adja, igy a szerveren es a bongeszoben is
 * egyforma, es tesztelheto.
 */

const IDOZONA = 'Europe/Budapest'

/**
 * Innentol forog az ajanlat. Fix pont kell, kulonben a "ne legyen ket
 * egymas utani napon ugyanaz" szabaly nem lenne eldontheto: minden nap
 * valasztasa az elozo napitol fugg, es valahol el kell kezdeni a lancot.
 */
export const KEZDET = '2026-10-01'

/**
 * Ennel tobb napot nem lepunk vegig. Evek mulva se lassuljon be, es a
 * lanc ilyen hosszan mar ugyis stabil.
 */
const MAX_LEPES = 4000

const NAP = 86_400_000

export type Feluliras = {
  /** Budapesti naptari nap, "ÉÉÉÉ-HH-NN". */
  datum: string
  /** A partner slug mezoje, pl. "sugar-bowling". */
  slug: string
}

const NAP_FORMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: IDOZONA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const TELJES_FORMA = new Intl.DateTimeFormat('en-CA', {
  timeZone: IDOZONA,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** A formazott reszek nev szerint, hogy ne a sorrendre epitsunk. */
function reszek(forma: Intl.DateTimeFormat, idopont: number): Record<string, string> {
  const ki: Record<string, string> = {}
  for (const resz of forma.formatToParts(idopont)) {
    if (resz.type !== 'literal') ki[resz.type] = resz.value
  }
  return ki
}

/** A budapesti naptari nap, "ÉÉÉÉ-HH-NN" alakban. */
export function budapestiNap(most: Date | number = Date.now()): string {
  const r = reszek(NAP_FORMA, typeof most === 'number' ? most : most.getTime())
  return `${r.year}-${r.month}-${r.day}`
}

/*
 * A napokkal UTC-ben szamolunk. A "ÉÉÉÉ-HH-NN" mar budapesti naptari nap,
 * az ebbol kepzett UTC ejfel pedig csak egy cimke rajta. Igy az oraatallitas
 * nem tud elcsuszast okozni: UTC-ben minden nap pontosan 24 ora.
 */
const napToIdo = (datum: string) => Date.parse(`${datum}T00:00:00Z`)
const idoToNap = (ido: number) => new Date(ido).toISOString().slice(0, 10)

export const elozoNap = (datum: string) => idoToNap(napToIdo(datum) - NAP)
export const kovetkezoNap = (datum: string) => idoToNap(napToIdo(datum) + NAP)

/** A het napja: 1 = hetfo, 7 = vasarnap. */
export function hetNapja(datum: string): number {
  const n = new Date(napToIdo(datum)).getUTCDay()
  return n === 0 ? 7 : n
}

/** Budapest eltolasa az adott pillanatban, ezredmasodpercben. */
function eltolas(idopont: number): number {
  const r = reszek(TELJES_FORMA, idopont)
  // Ejfelkor az "en-CA" 24-et is adhat 0 helyett, ezert a maradek.
  const ora = Number(r.hour) % 24
  const mintha = Date.UTC(Number(r.year), Number(r.month) - 1, Number(r.day), ora, Number(r.minute), Number(r.second))
  return mintha - Math.floor(idopont / 1000) * 1000
}

/**
 * A kovetkezo budapesti ejfel, ezredmasodpercben. Nem a fali ora
 * kulonbseget adja vissza, hanem a valodi pillanatot, ezert az
 * oraatallitas napjan is pontos.
 */
export function kovetkezoEjfel(most: Date | number = Date.now()): number {
  const ido = typeof most === 'number' ? most : most.getTime()
  const cel = napToIdo(kovetkezoNap(budapestiNap(ido)))
  // Ket korben befut: az elso becsles utan mar a helyes eltolast kapjuk.
  let talalat = cel
  for (let i = 0; i < 2; i++) talalat = cel - eltolas(talalat)
  return talalat
}

/** Nyitva van-e a hely azon a napon. Ures vagy hianyzo lista: minden nap. */
export function nyitva(partner: Partner, datum: string): boolean {
  if (!partner.openDays || partner.openDays.length === 0) return true
  return partner.openDays.includes(hetNapja(datum))
}

/**
 * A datumbol kepzett stabil szam. Nem veletlen es nem is kriptografia,
 * csak annyi a dolga, hogy a napok ne sorban kovessek egymast.
 */
function napiIndex(datum: string, hossz: number): number {
  let h = 2166136261
  for (let i = 0; i < datum.length; i++) {
    h ^= datum.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h) % hossz
}

/** Egyetlen nap valasztasa, ismerve az elozo napit. */
function egyNap(
  partnerek: Partner[],
  datum: string,
  felulirasok: Feluliras[],
  tegnapi: Partner | null,
): Partner {
  const kezi = felulirasok.find((f) => f.datum === datum)
  if (kezi) {
    const talalat = partnerek.find((p) => p.slug === kezi.slug)
    // A kezi felulirás mindent ver, meg a zarva tartast is.
    if (talalat) return talalat
  }

  // Ha aznap mindenki zarva van, inkabb mutatunk valakit, mint semmit.
  const nyitvak = partnerek.filter((p) => nyitva(p, datum))
  const lista = nyitvak.length > 0 ? nyitvak : partnerek

  const kezdo = napiIndex(datum, lista.length)
  for (let i = 0; i < lista.length; i++) {
    const jelolt = lista[(kezdo + i) % lista.length]
    if (!tegnapi || jelolt.slug !== tegnapi.slug) return jelolt
  }
  // Ide csak akkor jutunk, ha egyetlen partner van. Akkor nincs mit valtani.
  return lista[kezdo]
}

/**
 * Az adott napra jaro ajanlat. A lancot a KEZDET naptol gorgetjuk vegig,
 * igy egy adott nap valasztasa mindig ugyanaz, fuggetlenul attol, mikor
 * kerdezzuk meg.
 */
export function ajanlatRa(
  partnerek: Partner[],
  datum: string,
  felulirasok: Feluliras[] = [],
): Partner | null {
  if (partnerek.length === 0) return null

  const tavolsag = Math.round((napToIdo(datum) - napToIdo(KEZDET)) / NAP)
  const lepesek = Math.min(Math.max(tavolsag, 0), MAX_LEPES)

  let nap = idoToNap(napToIdo(datum) - lepesek * NAP)
  let valasztott: Partner | null = null
  for (let i = 0; i <= lepesek; i++) {
    valasztott = egyNap(partnerek, nap, felulirasok, valasztott)
    nap = kovetkezoNap(nap)
  }
  return valasztott
}
