import { useSyncExternalStore } from 'react'
import { CIM, KULCS } from './kliens'

/**
 * Az udvozlo ajandekok listaja: partner, szazalek, szabad darab. A popup,
 * a kartyak es az /ajandek/ oldal olvassa. Kijelentkezve is kell, ezert
 * sima fetch megy, a Supabase konyvtar nelkul: a fooldal igy nem nehezebb.
 *
 * Hogy mennyi a szabad darab, azt mindig a szerver szamolja, itt csak
 * megjelenitjuk. Valasztaskor ugyanugy a szerver dont.
 */
export type Ajanlat = {
  id: number
  partner_slug: string
  partner: string
  pct: number
  szabad: number
  mod: 'helyszini' | 'online_kod'
}

let lista: Ajanlat[] | null = null
let folyamatban: Promise<void> | null = null
const figyelok = new Set<() => void>()

/** Ujratolti a listat. Hiba eseten ures lista: akkor nincs mit mutatni. */
export function ajanlatokFrissitese(): Promise<void> {
  if (folyamatban) return folyamatban
  folyamatban = fetch(`${CIM}/rest/v1/rpc/ajandek_lista`, {
    method: 'POST',
    headers: { apikey: KULCS, 'Content-Type': 'application/json' },
    body: '{}',
  })
    .then((valasz) => (valasz.ok ? valasz.json() : []))
    .catch(() => [])
    .then((adat: unknown) => {
      lista = Array.isArray(adat) ? (adat as Ajanlat[]) : []
      figyelok.forEach((f) => f())
    })
    .finally(() => {
      folyamatban = null
    })
  return folyamatban
}

function feliratkozas(f: () => void) {
  figyelok.add(f)
  if (lista === null) void ajanlatokFrissitese()
  return () => figyelok.delete(f)
}

/** Null, amig nincs betoltve. A szerveren is null. */
export function useAjanlatok(): Ajanlat[] | null {
  return useSyncExternalStore(
    feliratkozas,
    () => lista,
    () => null,
  )
}

/** A partner valaszthato ajanlata, ha van meg belole szabad darab. */
export function partnerAjanlata(ajanlatok: Ajanlat[] | null, slug: string): Ajanlat | null {
  return ajanlatok?.find((a) => a.partner_slug === slug && a.szabad > 0) ?? null
}

/** A legnagyobb szazalek a valaszthato ajanlatok kozul, vagy null. */
export function legnagyobbSzazalek(ajanlatok: Ajanlat[] | null): number | null {
  const szabad = (ajanlatok ?? []).filter((a) => a.szabad > 0)
  return szabad.length > 0 ? Math.max(...szabad.map((a) => a.pct)) : null
}

/**
 * A kartya gombja kijelentkezett latogatonak. Ha a partnernel van meg
 * szabad ajandek, azt mutatja, kulonben a normal kedvezmenyt.
 */
export function kijelentkezettFelirat(ajanlatok: Ajanlat[] | null, slug: string, normal: string): string {
  const a = partnerAjanlata(ajanlatok, slug)
  return a
    ? `Regisztrálj: itt ${a.pct}% kedvezmény lehet az ajándékod (még ${a.szabad} db)`
    : `Lépj be, és megkapod a ${normal} kedvezményt`
}

const NAP = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', month: 'long', day: 'numeric' })

/** "november 17" alak, a vegso pont nelkul, hogy moge johessen a "-ig". */
export const hataridoNap = (iso: string) => NAP.format(new Date(iso)).replace(/\.$/, '')
