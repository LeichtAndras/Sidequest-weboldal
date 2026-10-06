import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const SUPABASE_VALTOZOK = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

/**
 * Eles buildnel megallitja a forditast, ha a Supabase cim vagy kulcs
 * hianyzik. Enelkul a csomag ures ertekekkel keszul el, a kesz oldal pedig
 * csendben csak annyit ir ki, hogy "A szavazas most nem elerheto": lokalisan
 * minden jonak latszik, mert ott a .env.local megvan. Jobb, ha a build all
 * meg, mint ha torott oldal kerulne ki.
 */
function supabaseEllenorzes(kornyezet: Record<string, string>): Plugin {
  return {
    name: 'sidequest-supabase-ellenorzes',
    apply: 'build',
    buildStart() {
      const hianyzik = SUPABASE_VALTOZOK.filter((nev) => !kornyezet[nev]?.trim())
      if (hianyzik.length === 0) return

      this.error(
        `Hianyzik a build kornyezetebol: ${hianyzik.join(', ')}.\n` +
          'Fejlesztesnel a .env.local adja meg oket, a GitHub Actionsben pedig\n' +
          'a repo titkai, lasd .github/workflows/deploy.yml.',
      )
    },
  }
}

export default defineConfig(({ isSsrBuild, mode }) => ({
  // Az oldal a sidequestbp.hu gyokereben fut, ezert a base "/".
  // Ha valaha alkonyvtarbol szolgalnank ki, pl. felhasznalonev.github.io/sidequest/,
  // akkor ezt "/sidequest/"-re kell atirni.
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    // A "." a futtatas konyvtara, igy nem kell ide a node tipusa
    supabaseEllenorzes(loadEnv(mode, '.', 'VITE_')),
  ],
  build: {
    // Az eloreneneleshez keszulo csomag melle nem kell a public mappa masolata
    copyPublicDir: !isSsrBuild,
  },
}))
