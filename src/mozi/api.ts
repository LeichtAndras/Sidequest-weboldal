/**
 * Supabase hivasok sima fetch-csel. A kliens konyvtar helyett azert igy,
 * mert osszesen ket vegpont kell, es a landing oldal csomagmerete szamit.
 * A filmkereses nem ide tartozik, az a Wikidatarol jon, lasd wikidata.ts.
 */

const CIM = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? ''
const KULCS = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/** Be van-e allitva a ket kornyezeti valtozo. */
export const vanBeallitva = Boolean(CIM && KULCS)

/** Felhasznalonak mutathato hibauzenet, mindig magyarul. */
export class MoziHiba extends Error {}

const fejlec = {
  'Content-Type': 'application/json',
  apikey: KULCS,
  Authorization: `Bearer ${KULCS}`,
}

async function hivas<T>(utvonal: string, test: unknown, jel?: AbortSignal): Promise<T> {
  if (!vanBeallitva) {
    throw new MoziHiba('A szavazás most nem elérhető. Nézz vissza kicsit később.')
  }

  let valasz: Response
  try {
    valasz = await fetch(`${CIM}${utvonal}`, {
      method: 'POST',
      headers: fejlec,
      body: JSON.stringify(test),
      signal: jel,
    })
  } catch (hiba) {
    if (hiba instanceof DOMException && hiba.name === 'AbortError') throw hiba
    throw new MoziHiba('Nincs kapcsolat. Ellenőrizd a netet, és próbáld újra.')
  }

  if (!valasz.ok) {
    throw new MoziHiba('Valami félrement a szerveren. Próbáld újra pár másodperc múlva.')
  }

  try {
    return (await valasz.json()) as T
  } catch {
    throw new MoziHiba('Váratlan válasz érkezett. Próbáld újra.')
  }
}

export type ToplistaSor = {
  wikidata_id: string
  title: string
  year: number | null
  director: string | null
  szavazat: number
}

export type Toplista = { osszes: number; lista: ToplistaSor[] }

export async function toplista(jel?: AbortSignal): Promise<Toplista> {
  const valasz = await hivas<Toplista | null>('/rest/v1/rpc/get_leaderboard', {}, jel)
  return { osszes: valasz?.osszes ?? 0, lista: valasz?.lista ?? [] }
}

export type SzavazasValasz =
  | { statusz: 'ok' }
  | { statusz: 'mar_szavaztal' }
  | { statusz: 'nincs_nyitva' }
  | { statusz: 'tul_sok' }

const SZAVAZAS_UZENET: Record<Exclude<SzavazasValasz['statusz'], 'ok'>, string> = {
  mar_szavaztal: 'Erről az eszközről már érkezett szavazat. Egy szavazat jut mindenkinek.',
  nincs_nyitva: 'A szavazás most nincs nyitva.',
  tul_sok: 'Erről a hálózatról már sok szavazat érkezett. Próbáld meg máshonnan.',
}

export async function szavaz(adat: {
  wikidataId: string
  cim: string
  ev: number | null
  rendezo: string | null
  eszkozId: string
}): Promise<void> {
  const valasz = await hivas<SzavazasValasz>('/rest/v1/rpc/cast_vote', {
    p_wikidata_id: adat.wikidataId,
    p_title: adat.cim,
    p_year: adat.ev,
    p_director: adat.rendezo,
    p_device_id: adat.eszkozId,
  })

  if (valasz?.statusz === 'ok') return
  throw new MoziHiba(
    SZAVAZAS_UZENET[valasz?.statusz as Exclude<SzavazasValasz['statusz'], 'ok'>] ??
      'A szavazat most nem ment át. Próbáld újra.',
  )
}
