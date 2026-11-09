import { useEffect, useState, useSyncExternalStore } from 'react'
import { CIM, KULCS } from './kliens'

/**
 * Az aktiv ajanlatok (alap, welcome, drop) a szabad darabszammal, a
 * kovetkezo keretinditassal es a szerver idejevel. Kijelentkezve is kell,
 * ezert sima fetch megy, a Supabase konyvtar nelkul.
 *
 * Hogy mennyi a szabad darab, mindig a szerver szamolja (kinalat RPC).
 */
export type Ajanlat = {
  id: number
  tipus: 'alap' | 'welcome' | 'drop'
  partner_slug: string
  partner: string
  szoveg: string
  jelveny: string | null
  mod: 'helyszini' | 'online_kod'
  keret: number
  szabad: number
  napi_limit: number | null
  napok: number[] | null
  ervenyes_nap: number
  drop_kezdes: string | null
  drop_vege: string | null
  utolso_igenyles: string | null
}

export type Kinalat = {
  /** A szerver ideje a valasz pillanataban. */
  most: string
  /** A kovetkezo havi keret elso napja, pl. "2026-12-01". */
  uj_keret: string
  ajanlatok: Ajanlat[]
  /**
   * A szerver es a telefon orajanak kulonbsege ezredmasodpercben (kliens
   * szamolja). A drop visszaszamlaloja ehhez igazodik, nem a telefonhoz.
   */
  eltolas: number
}

let adat: Kinalat | null = null
let folyamatban: Promise<void> | null = null
const figyelok = new Set<() => void>()

/** Ujratolti a kinalatot. Hiba eseten a regi marad. */
export function kinalatFrissitese(): Promise<void> {
  if (folyamatban) return folyamatban
  const kuldve = Date.now()
  folyamatban = fetch(`${CIM}/rest/v1/rpc/kinalat`, {
    method: 'POST',
    headers: { apikey: KULCS, 'Content-Type': 'application/json' },
    body: '{}',
  })
    .then((valasz) => (valasz.ok ? (valasz.json() as Promise<Kinalat>) : null))
    .catch(() => null)
    .then((uj) => {
      if (uj && Array.isArray(uj.ajanlatok)) {
        // A halozati ido felet hozzaadjuk, igy a szerver ideje pontos marad
        const megjott = Date.now()
        adat = { ...uj, eltolas: Date.parse(uj.most) - (kuldve + megjott) / 2 }
        figyelok.forEach((f) => f())
      }
    })
    .finally(() => {
      folyamatban = null
    })
  return folyamatban
}

function feliratkozas(f: () => void) {
  figyelok.add(f)
  if (adat === null) void kinalatFrissitese()
  return () => figyelok.delete(f)
}

/** Null, amig nincs betoltve. A szerveren is null. */
export function useKinalat(): Kinalat | null {
  return useSyncExternalStore(
    feliratkozas,
    () => adat,
    () => null,
  )
}

/** A partner aktiv alap ajanlata, ha van. */
export function alapAjanlat(k: Kinalat | null, slug: string): Ajanlat | null {
  return k?.ajanlatok.find((a) => a.tipus === 'alap' && a.partner_slug === slug) ?? null
}

/** A partner welcome ajanlata, ha van meg belole szabad darab. */
export function welcomeAjanlat(k: Kinalat | null, slug: string): Ajanlat | null {
  return k?.ajanlatok.find((a) => a.tipus === 'welcome' && a.partner_slug === slug && a.szabad > 0) ?? null
}

/**
 * A kartya gombja kijelentkezett latogatonak: ha itt valaszthato welcome
 * ajanlat van, azt mutatja, kulonben az alap ajanlatot.
 */
export function kijelentkezettFelirat(k: Kinalat | null, slug: string, alap: string): string {
  const w = welcomeAjanlat(k, slug)
  if (!w) return `Lépj be, és megkapod: ${alap}`
  // "40% kedvezmény" -> "40% kedvezményt"; mas szabad szovegnel nem ragozunk
  return /kedvezmény$/i.test(w.szoveg)
    ? `Regisztrálj, és ${w.szoveg}t kaphatsz ajándékba (még ${w.szabad} db)`
    : `Regisztrálj, és ajándékba kaphatod: ${w.szoveg} (még ${w.szabad} db)`
}

const HONAP = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', month: 'long' })

/** "december 1-jén": a kovetkezo havi keret indulasa. */
export const ujKeretNap = (k: Kinalat) => `${HONAP.format(new Date(`${k.uj_keret}T12:00:00Z`))} 1-jén`

/**
 * A szamlalo szovege: 20 db felett "Elérhető" (welcome-nal nem), kulonben "Még X db",
 * 0-nal "Elfogyott · Új keret december 1-jén". Dropnal nincs uj keret.
 */
export function keretSzoveg(a: Ajanlat, k: Kinalat): string {
  // A welcome szamlaloja mindig a darabszamot mutatja
  if (a.szabad > 20 && a.tipus !== 'welcome') return 'Elérhető'
  if (a.szabad > 0) return `Még ${a.szabad} db`
  return a.tipus === 'drop' ? 'Elfogyott' : `Elfogyott · Új keret ${ujKeretNap(k)}`
}

const NAP = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', month: 'long', day: 'numeric' })

/** "november 17" alak, a vegso pont nelkul, hogy moge johessen a "-ig". */
export const hataridoNap = (iso: string) => NAP.format(new Date(iso)).replace(/\.$/, '')

/**
 * A szerver szerinti most, masodpercenkent frissulve. Csak a bongeszoben
 * ketyeg; kikapcsolt ketyegesnel (aktiv = false) egyszer szamol.
 */
export function useSzerverIdo(eltolas: number, aktiv = true): number {
  const [most, setMost] = useState(() => Date.now() + eltolas)
  useEffect(() => {
    setMost(Date.now() + eltolas)
    if (!aktiv) return
    const ido = window.setInterval(() => setMost(Date.now() + eltolas), 1000)
    return () => window.clearInterval(ido)
  }, [eltolas, aktiv])
  return most
}

export type DropAllapot = 'kozelgo' | 'elo' | 'lezart'

/** Kozelgo (meg nem indult), elo, vagy lezart (vege van, vagy elfogyott). */
export function dropAllapot(a: Ajanlat, most: number): DropAllapot {
  if (most < Date.parse(a.drop_kezdes!)) return 'kozelgo'
  if (most >= Date.parse(a.drop_vege!) || a.szabad < 1) return 'lezart'
  return 'elo'
}

/** "Elfogyott 4 perc alatt" (utolso igenyles minusz kezdes), vagy "Lezárult". */
export function dropZaroSzoveg(a: Ajanlat): string {
  if (a.szabad > 0 || !a.utolso_igenyles) return 'Lezárult'
  const mp = Math.max(1, Math.round((Date.parse(a.utolso_igenyles) - Date.parse(a.drop_kezdes!)) / 1000))
  return mp < 60 ? `Elfogyott ${mp} másodperc alatt` : `Elfogyott ${Math.round(mp / 60)} perc alatt`
}

const INDULAS = new Intl.DateTimeFormat('hu-HU', {
  timeZone: 'Europe/Budapest',
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "csütörtök, november 12. 19:30" alak (a hu-HU alapbol a nap nevet a datum moge tenne). */
export function dropIndulas(a: Ajanlat): string {
  const r = Object.fromEntries(INDULAS.formatToParts(new Date(a.drop_kezdes!)).map((p) => [p.type, p.value]))
  return `${r.weekday}, ${r.month} ${r.day}. ${r.hour}:${r.minute}`
}

/** A kovetkezo elo, vagy ha nincs, a legkozelebbi kozelgo drop. */
export function kiemeltDrop(k: Kinalat | null, most: number): Ajanlat | null {
  const dropok = (k?.ajanlatok ?? []).filter((a) => a.tipus === 'drop')
  const elo = dropok.find((a) => dropAllapot(a, most) === 'elo')
  if (elo) return elo
  return (
    dropok
      .filter((a) => dropAllapot(a, most) === 'kozelgo')
      .sort((x, y) => Date.parse(x.drop_kezdes!) - Date.parse(y.drop_kezdes!))[0] ?? null
  )
}
