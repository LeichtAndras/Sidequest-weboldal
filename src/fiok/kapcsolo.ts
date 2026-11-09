import { useSyncExternalStore } from 'react'
import partnersData from '../data/partners.json'
import type { Partner } from '../types'
import { kliens, vanTaroltMunkamenet } from './kliens'

/**
 * Az uj fiokos rendszer kapcsoloja. Amig egy partnernel az ujBevaltas
 * hamis, a latogato a regi modon latja (QR, kozos kod): nincs Belépés
 * pirula, nincs popup, nincs beváltás gomb, nincs drop, es a bongeszo
 * egyaltalan nem hivja a Supabase-t.
 *
 * Elonezet: ?uj=1 bekapcsolja ebben a bongeszoben minden partnernel, es
 * meg is jegyzi (?uj=0 kikapcsolja). DE:
 *   - fejlesztoi szerveren (npm run dev, localhost) mindenkinek mukodik;
 *   - az eles oldalon csak belepett tesztelonek (profiles.tesztelo). Mas
 *     latogato ?uj=1-gyel is a regi oldalt kapja. A tesztelo ellenorzese
 *     csak akkor fut, ha van tarolt belepes, igy a sima latogato semmit
 *     nem kuld a Supabase-nek. A tesztelo a /fiokom/ oldalon lep be.
 *
 * A szerveren es a hidratalasnal mindig a partnerek kapcsoloja szamit,
 * az elonezet csak utana kapcsol be, igy az eloreneneles nem csuszik el.
 * A szerver (RPC-k) a sajat uj_bevaltas / tesztelo ellenorzeset vegzi.
 */
const KULCS = 'sq-uj'

const VAN_ELES_PARTNER = (partnersData as Partner[]).some((p) => p.ujBevaltas === true)

/** Fejlesztoi szerver vagy helyi gep: itt az elonezet mindenkinek mukodik. */
function fejlesztes(): boolean {
  return import.meta.env.DEV || ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
}

/** Kerte-e az elonezetet (?uj=1 most vagy korabban). */
let kerte: boolean | null = null
/** Eles oldalon: belepett tesztelo-e. Null, amig nem ellenoriztuk. */
let tesztelo: boolean | null = null
let ellenorzesIndult = false
const figyelok = new Set<() => void>()

function kerteOlvasasa(): boolean {
  if (kerte !== null) return kerte
  const parameter = new URLSearchParams(window.location.search).get('uj')
  kerte = parameter === '1'
  try {
    if (parameter === '1') localStorage.setItem(KULCS, '1')
    else if (parameter === '0') localStorage.removeItem(KULCS)
    kerte = localStorage.getItem(KULCS) === '1'
  } catch {
    // Tarolo nelkul csak az aktualis oldalon el a parameter
  }
  return kerte
}

/** Eles oldalon a tesztelo ellenorzese. Csak tarolt belepessel indul el. */
function teszteloEllenorzese() {
  if (ellenorzesIndult || fejlesztes() || !kerteOlvasasa() || !vanTaroltMunkamenet()) return
  ellenorzesIndult = true
  void kliens()
    .then(async (sb) => {
      const { data: felhasznalo } = await sb.auth.getUser()
      if (!felhasznalo.user) return false
      const { data } = await sb.from('profiles').select('tesztelo').maybeSingle()
      return data?.tesztelo === true
    })
    .catch(() => false)
    .then((ok) => {
      tesztelo = ok
      figyelok.forEach((f) => f())
    })
}

function feliratkozas(f: () => void) {
  figyelok.add(f)
  teszteloEllenorzese()
  return () => figyelok.delete(f)
}

function elonezetOlvasasa(): boolean {
  if (!kerteOlvasasa()) return false
  return fejlesztes() || tesztelo === true
}

/**
 * Lathato-e az uj rendszer. Partnerrel: annal a partnernel. Partner
 * nelkul (pirula, popup, drop): ha legalabb egy partnernel be van
 * kapcsolva.
 */
export function useUjRendszer(partner?: Partner): boolean {
  const elo = useSyncExternalStore(feliratkozas, elonezetOlvasasa, () => false)
  if (elo) return true
  return partner ? partner.ujBevaltas === true : VAN_ELES_PARTNER
}
