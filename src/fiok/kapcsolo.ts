import { useSyncExternalStore } from 'react'
import partnersData from '../data/partners.json'
import type { Partner } from '../types'

/**
 * Az uj fiokos rendszer kapcsoloja. Amig egy partnernel az ujBevaltas
 * hamis, a latogato a regi modon latja (QR, kozos kod): nincs Belépés
 * pirula, nincs beváltás gomb, nincs kodos resz.
 *
 * Teszteleshez: ?uj=1 a cim vegen bekapcsolja ebben a bongeszoben minden
 * partnernel, es meg is jegyzi, igy a Fiókom oldalra atlepve is marad.
 * ?uj=0 kikapcsolja.
 *
 * A szerveren es a hidratalasnal mindig a partnerek kapcsoloja szamit,
 * az elonezet csak utana kapcsol be, igy az eloreneneles nem csuszik el.
 */
const KULCS = 'sq-uj'

const VAN_ELES_PARTNER = (partnersData as Partner[]).some((p) => p.ujBevaltas === true)

let elonezet: boolean | null = null

function elonezetOlvasasa(): boolean {
  if (elonezet !== null) return elonezet
  const parameter = new URLSearchParams(window.location.search).get('uj')
  elonezet = parameter === '1'
  try {
    if (parameter === '1') localStorage.setItem(KULCS, '1')
    else if (parameter === '0') localStorage.removeItem(KULCS)
    elonezet = localStorage.getItem(KULCS) === '1'
  } catch {
    // Tarolo nelkul csak az aktualis oldalon el a parameter
  }
  return elonezet
}

const nincsValtozas = () => () => {}

/**
 * Lathato-e az uj rendszer. Partnerrel: annal a partnernel. Partner
 * nelkul (pirula, belepo ablak): ha legalabb egy partnernel be van
 * kapcsolva.
 */
export function useUjRendszer(partner?: Partner): boolean {
  const elo = useSyncExternalStore(nincsValtozas, elonezetOlvasasa, () => false)
  if (elo) return true
  return partner ? partner.ujBevaltas === true : VAN_ELES_PARTNER
}
