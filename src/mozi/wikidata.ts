/**
 * Filmkereses a Wikidatan. Kozvetlenul a bongeszobol megy, mert a Wikidata
 * API origin=* mellett engedi a CORS kereseket. Nincs hozza kulcs es nincs
 * szukseg kozbeiktatott szerverre.
 */

const API = 'https://www.wikidata.org/w/api.php'
/** "film peldanya", ez szuri ki, hogy csak filmek jojjenek. */
const FILM_ALLITAS = 'haswbstatement:P31=Q11424'
/** Megjelenes datuma. */
const P_MEGJELENES = 'P577'
/** Rendezo. */
const P_RENDEZO = 'P57'
const NYELVEK = 'hu|en'
const MAX = 8

export class WikidataHiba extends Error {}

export type Talalat = {
  /** Wikidata azonosito, pl. "Q12345". */
  id: string
  cim: string
  ev: number | null
  rendezo: string | null
}

async function kerdez(parameterek: Record<string, string>, jel?: AbortSignal) {
  const cim = new URL(API)
  cim.searchParams.set('format', 'json')
  cim.searchParams.set('origin', '*')
  for (const [kulcs, ertek] of Object.entries(parameterek)) cim.searchParams.set(kulcs, ertek)

  let valasz: Response
  try {
    valasz = await fetch(cim, { signal: jel })
  } catch (baj) {
    if (baj instanceof DOMException && baj.name === 'AbortError') throw baj
    throw new WikidataHiba('Nincs kapcsolat a filmadatbázissal. Ellenőrizd a netet.')
  }

  if (!valasz.ok) throw new WikidataHiba('A filmadatbázis most nem válaszol. Próbáld újra.')

  try {
    return (await valasz.json()) as Record<string, unknown>
  } catch {
    throw new WikidataHiba('Váratlan válasz érkezett a filmadatbázistól.')
  }
}

type Allitas = {
  mainsnak?: {
    datavalue?: { value?: { time?: string; id?: string } }
  }
}

type Elem = {
  labels?: Record<string, { value?: string }>
  claims?: Record<string, Allitas[]>
}

/** A hu cimet hasznaljuk, ha nincs, az angolt. */
function cimbol(elem: Elem | undefined) {
  return elem?.labels?.hu?.value ?? elem?.labels?.en?.value ?? null
}

/** A legkorabbi megjelenesi ev a P577 allitasokbol. */
function evbol(elem: Elem | undefined) {
  const allitasok = elem?.claims?.[P_MEGJELENES] ?? []
  let legkorabbi: number | null = null
  for (const allitas of allitasok) {
    const ido = allitas.mainsnak?.datavalue?.value?.time
    // A formatum "+2010-07-16T00:00:00Z", az elso negy szamjegy az ev.
    const talalat = typeof ido === 'string' ? ido.match(/^[+-](\d{4})/) : null
    if (!talalat) continue
    const ev = Number(talalat[1])
    if (!Number.isFinite(ev) || ev === 0) continue
    if (legkorabbi === null || ev < legkorabbi) legkorabbi = ev
  }
  return legkorabbi
}

/** Az elso rendezo Wikidata azonositoja. */
function rendezoAzonosito(elem: Elem | undefined) {
  return elem?.claims?.[P_RENDEZO]?.[0]?.mainsnak?.datavalue?.value?.id ?? null
}

/**
 * Harom lepes: kereses, majd a talalatok adatai, vegul a rendezok nevei.
 * A harmadik hivas kimarad, ha egyik filmnek sincs rendezoje megadva.
 */
export async function keresFilmet(kifejezes: string, jel?: AbortSignal): Promise<Talalat[]> {
  const szoveg = kifejezes.trim()
  if (szoveg.length < 2) return []

  const kereses = (await kerdez(
    {
      action: 'query',
      list: 'search',
      srsearch: `${FILM_ALLITAS} ${szoveg}`,
      srlimit: String(MAX),
    },
    jel,
  )) as { query?: { search?: Array<{ title?: string }> } }

  const azonositok = (kereses.query?.search ?? [])
    .map((sor) => sor.title)
    .filter((id): id is string => typeof id === 'string' && /^Q\d+$/.test(id))
    .slice(0, MAX)

  if (azonositok.length === 0) return []

  const elemek = (await kerdez(
    {
      action: 'wbgetentities',
      ids: azonositok.join('|'),
      props: 'labels|claims',
      languages: NYELVEK,
    },
    jel,
  )) as { entities?: Record<string, Elem> }

  const entitasok = elemek.entities ?? {}

  // A rendezok nevei egyetlen tovabbi hivasban
  const rendezoIdk = [
    ...new Set(
      azonositok
        .map((id) => rendezoAzonosito(entitasok[id]))
        .filter((id): id is string => typeof id === 'string'),
    ),
  ]

  let rendezoNevek: Record<string, Elem> = {}
  if (rendezoIdk.length > 0) {
    const valasz = (await kerdez(
      {
        action: 'wbgetentities',
        ids: rendezoIdk.join('|'),
        props: 'labels',
        languages: NYELVEK,
      },
      jel,
    )) as { entities?: Record<string, Elem> }
    rendezoNevek = valasz.entities ?? {}
  }

  // A kereses sorrendjet tartjuk meg, es a cim nelkulieket kihagyjuk
  return azonositok
    .map((id) => {
      const elem = entitasok[id]
      const cim = cimbol(elem)
      if (!cim) return null
      const rendezoId = rendezoAzonosito(elem)
      return {
        id,
        cim,
        ev: evbol(elem),
        rendezo: rendezoId ? cimbol(rendezoNevek[rendezoId]) : null,
      } satisfies Talalat
    })
    .filter((talalat): talalat is Talalat => talalat !== null)
}
