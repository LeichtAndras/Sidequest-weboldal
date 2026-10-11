/**
 * Esemenykuldes a meglevo Cloudflare fiokba, Zarazon keresztul.
 *
 * Nincs uj script az oldalon: a Zaraz, ha be van kapcsolva a Cloudflare
 * dashboardon, maga teszi be a window.zaraz objektumot. Ha nincs
 * bekapcsolva, ezek a hivasok csendben nem csinalnak semmit, es az oldal
 * ugyanugy mukodik. Az oldalmegtekintest tovabbra is a Web Analytics
 * beacon meri, azt nem bantjuk.
 */

type Zaraz = { track: (nev: string, adat?: Record<string, unknown>) => void }

declare global {
  interface Window {
    zaraz?: Zaraz
  }
}

/** Az ajanlat kartya lathatova valt. */
export const MEGJELENT = 'mai_ajanlat_megjelent'
/** A latogato ratett a gombra. */
export const KATTINTAS = 'mai_ajanlat_kattintas'

export function kovet(nev: string, adat?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    window.zaraz?.track(nev, adat)
  } catch {
    // A merés sosem torheti el az oldalt.
  }
}
