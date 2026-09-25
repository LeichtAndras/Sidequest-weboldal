import type { Partner } from './types'

/** Ennyi napig szamit ujnak egy partner a felvetel datumatol. */
export const UJ_NAPOK = 30

/**
 * Uj-e a partner. Ures vagy ertelmezhetetlen datum eseten nem.
 * A jovobe datalt felvetel is ujnak szamit, igy elore fel lehet venni.
 */
export function ujPartner(partner: Partner, most: number = Date.now()) {
  const nyers = partner.addedDate?.trim()
  if (!nyers) return false

  const datum = Date.parse(nyers)
  if (Number.isNaN(datum)) return false

  const eltelt = (most - datum) / 86_400_000
  return eltelt <= UJ_NAPOK
}
