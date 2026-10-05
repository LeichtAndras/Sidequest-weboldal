const KULCS = 'sidequest-mozi-eszkoz'

/**
 * Eszkozazonosito: veletlen UUID a localStorage-ban. Ettol tudja a szerver,
 * hogy egy bongeszo csak egyszer szavazhat. Nem szemelyes adat.
 */
export function eszkozAzonosito(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const meglevo = window.localStorage.getItem(KULCS)
    if (meglevo) return meglevo
    const uj = window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : `sq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    window.localStorage.setItem(KULCS, uj)
    return uj
  } catch {
    // Privat ablakban vagy tiltott tarolonal nincs azonosito, ilyenkor
    // a szavazas nem megy, de az oldal tovabbra is mukodik.
    return null
  }
}

const SZAVAZAT_KULCS = 'sidequest-mozi-szavazat'

export type Szavazatom = { wikidataId: string; cim: string }

/** A sajat szavazat, hogy ujratoltes utan is kiemelheto legyen a listaban. */
export function sajatSzavazat(): Szavazatom | null {
  if (typeof window === 'undefined') return null
  try {
    const nyers = window.localStorage.getItem(SZAVAZAT_KULCS)
    if (!nyers) return null
    const ertek = JSON.parse(nyers) as Partial<Szavazatom>
    // Regebbi formatumu szavazat eseten inkabb elfelejtjuk
    return typeof ertek.wikidataId === 'string' && typeof ertek.cim === 'string'
      ? { wikidataId: ertek.wikidataId, cim: ertek.cim }
      : null
  } catch {
    return null
  }
}

export function mentsSzavazat(szavazat: Szavazatom) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SZAVAZAT_KULCS, JSON.stringify(szavazat))
  } catch {
    // A szavazat a szerveren akkor is megvan, csak kiemelni nem tudjuk
  }
}
