import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * A Supabase kliens a fiokokhoz. Lusta: a konyvtar csak akkor toltodik le,
 * amikor valaki belepne, vagy mar be van lepve. A fooldal elso betoltesehez
 * nem kell, a szavazas sima fetch-csel megy tovabb (lasd mozi/api.ts).
 */

const CIM = import.meta.env.VITE_SUPABASE_URL?.replace(/\/+$/, '') ?? ''
const KULCS = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

/**
 * Ezen a kulcson tarolja a munkamenetet a bongeszo. Sajat nev, hogy a
 * konyvtar betoltese nelkul is meg lehessen nezni, be van-e lepve valaki.
 */
export const TAROLO_KULCS = 'sq-fiok'

let igeret: Promise<SupabaseClient> | null = null

export function kliens(): Promise<SupabaseClient> {
  if (!igeret) {
    igeret = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(CIM, KULCS, {
        auth: {
          storageKey: TAROLO_KULCS,
          // Hosszu tavu belepes: a munkamenet megmarad, es magatol frissul
          persistSession: true,
          autoRefreshToken: true,
          // Kodos belepes van, link nincs, igy a cimsorban sincs mit keresni
          detectSessionInUrl: false,
        },
      }),
    )
  }
  return igeret
}

/** Van-e tarolt munkamenet. Gyors, a konyvtarat nem tolti be. */
export function vanTaroltMunkamenet(): boolean {
  try {
    return typeof window !== 'undefined' && Boolean(window.localStorage.getItem(TAROLO_KULCS))
  } catch {
    // Privat mod vagy tiltott tarolo: akkor nincs mit visszaallitani
    return false
  }
}
