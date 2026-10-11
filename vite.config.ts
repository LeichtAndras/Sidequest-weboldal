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

/**
 * A build napja budapesti ido szerint. A mai ajanlat elso renderje ezt
 * hasznalja a szerveren es a bongeszoben is, igy a hidratalas illeszkedik.
 * A valodi mai napra a kliens a beakadas utan valt.
 */
function buildNap() {
  const r: Record<string, string> = {}
  const forma = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  for (const resz of forma.formatToParts(Date.now())) {
    if (resz.type !== 'literal') r[resz.type] = resz.value
  }
  return `${r.year}-${r.month}-${r.day}`
}

export default defineConfig(({ isSsrBuild, mode }) => ({
  define: {
    __BUILD_NAP__: JSON.stringify(buildNap()),
  },
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
