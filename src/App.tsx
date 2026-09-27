import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import partnersData from './data/partners.json'
import ThumbCard from './components/ThumbCard'
import CategoryFilter, { ALL } from './components/CategoryFilter'
import Reveal from './components/Reveal'
import Subscribe from './components/Subscribe'
import Header from './components/Header'
import Milestone from './components/Milestone'
import FalHatter, { falak } from './components/FalHatter'
import { InstagramIcon, TikTokIcon } from './components/Icons'
import type { Partner } from './types'
import { slugFromPath } from './site'
import { ujPartner } from './partner'

const nyersPartnerek = partnersData as Partner[]

/**
 * Az ujonnan felvett helyek a lista elejere kerulnek, a tobbi sorrendje
 * valtozatlan marad. A rendezes stabil, igy az azonos csoportba esok
 * megtartjak az eredeti sorrendjuket.
 */
const partners = [...nyersPartnerek].sort(
  (a, b) => Number(ujPartner(b)) - Number(ujPartner(a)),
)

// A szuro gombok sorrendje az eredeti listat koveti, nem az uj partnereket.
const categories = [...new Set(nyersPartnerek.map((partner) => partner.category))]

/** Harom merfoldko, minden harmadik kartya utan. */
const merfoldkovek = [
  { szam: '9', szoveg: 'partner Budapesten' },
  { szam: '10 000', szoveg: 'követő, nagyjából' },
  { szam: '4', szoveg: 'hónap alatt' },
]

/** A cimsorbol indulunk: /magic-rooms/ eseten ez a kartya nyilik ki. */
function partnerACimbol() {
  if (typeof window === 'undefined') return null
  const slug = slugFromPath(window.location.pathname)
  return partners.find((partner) => partner.slug === slug) ?? null
}

type FigyeloProps = {
  sorszam: number
  jelez: (sorszam: number) => void
  children: ReactNode
}

/**
 * Szol, amikor a kartya a kepernyo kozepere er. A megfigyelo hatara egy
 * nulla magas sav a kepernyo kozepen, igy gorgeteskor nem szamolunk semmit.
 */
function KozepFigyelo({ sorszam, jelez, children }: FigyeloProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const elem = ref.current
    if (!elem) return

    const figyelo = new IntersectionObserver(
      (bejegyzesek) => {
        for (const bejegyzes of bejegyzesek) {
          if (bejegyzes.isIntersecting) jelez(sorszam)
        }
      },
      { rootMargin: '-50% 0px -50% 0px', threshold: 0 },
    )

    figyelo.observe(elem)
    return () => figyelo.disconnect()
  }, [sorszam, jelez])

  return <div ref={ref}>{children}</div>
}

export default function App() {
  const [openPartner, setOpenPartner] = useState<string | null>(() => partnerACimbol()?.name ?? null)
  const [category, setCategory] = useState(ALL)
  const [aktivFal, setAktivFal] = useState(0)

  const falraLep = useCallback((sorszam: number) => {
    setAktivFal((jelenlegi) => (jelenlegi === sorszam ? jelenlegi : sorszam))
  }, [])

  // Megosztott linkrol erkezve odagorgetunk a kartyara.
  useEffect(() => {
    const partner = partnerACimbol()
    if (!partner) return

    // A bongeszo sajat gorgetes visszaallitasa felulirna a mienket.
    const eredetiVisszaallitas = window.history.scrollRestoration
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'

    let megszakit = false
    const megall = () => {
      megszakit = true
    }

    const oda = () => {
      if (megszakit) return
      const elem = document.getElementById(`partner-${partner.slug}`)
      if (!elem) return
      // Nem offsetTop: a beuszo animacio eltolasa miatt az a kartyara nezve nulla lenne.
      const cel = elem.getBoundingClientRect().top + window.scrollY - 16
      window.scrollTo({ top: Math.max(cel, 0) })
    }

    // Ha a latogato maga gorget vagy erint, tobbet nem mozgatjuk alola az oldalt.
    window.addEventListener('wheel', megall, { passive: true, once: true })
    window.addEventListener('touchstart', megall, { passive: true, once: true })
    window.addEventListener('keydown', megall, { once: true })

    oda()
    window.addEventListener('load', oda)
    // A kepek es a betuk elhelyezkedese utan meg egyszer.
    const idozitok = [window.setTimeout(oda, 120), window.setTimeout(oda, 600)]

    return () => {
      window.removeEventListener('load', oda)
      window.removeEventListener('wheel', megall)
      window.removeEventListener('touchstart', megall)
      window.removeEventListener('keydown', megall)
      idozitok.forEach(window.clearTimeout)
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = eredetiVisszaallitas
      }
    }
  }, [])

  // A cimsor koveti a nyitott kartyat. replaceState, igy nem ugrik az oldal.
  useEffect(() => {
    const partner = partners.find((item) => item.name === openPartner)
    const utvonal = partner ? `/${partner.slug}/` : '/'
    if (window.location.pathname !== utvonal) {
      window.history.replaceState(null, '', utvonal)
    }
  }, [openPartner])

  const visible = useMemo(
    () => (category === ALL ? partners : partners.filter((partner) => partner.category === category)),
    [category],
  )

  // Kartyankent egy allando fuggveny, kulonben minden allapotvaltozas utan
  // ujrarajzolodna az osszes kartya.
  const valtok = useMemo(
    () =>
      new Map(
        partners.map((partner) => [
          partner.name,
          () => setOpenPartner((jelenlegi) => (jelenlegi === partner.name ? null : partner.name)),
        ]),
      ),
    [],
  )

  function selectCategory(next: string) {
    setCategory(next)
    setOpenPartner(null)
  }

  return (
    <div className="min-h-dvh">
      <Header />

      {/* A grafiti fal a fejlec alatt indul, es a tartalom mogott all */}
      <div className="relative">
        <FalHatter aktiv={aktivFal} />

        <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-6 pb-12 md:max-w-[1120px]">
          <nav aria-label="Kategóriák">
            <CategoryFilter categories={categories} active={category} onSelect={selectCategory} />
          </nav>

          {/* Asztalon harom oszlop: a harom kartyas blokkok igy egy-egy teljes sort adnak */}
          <main key={category} className="mt-4 flex flex-col gap-6 md:grid md:grid-cols-3 md:gap-7">
            {visible.map((partner, index) => {
              const merfoldko =
                category === ALL && (index + 1) % 3 === 0 ? merfoldkovek[(index + 1) / 3 - 1] : null

              return (
                <Fragment key={partner.name}>
                  <KozepFigyelo
                    sorszam={falak.length > 0 ? index % falak.length : 0}
                    jelez={falraLep}
                  >
                    <Reveal>
                      <ThumbCard
                        partner={partner}
                        open={openPartner === partner.name}
                        onToggle={valtok.get(partner.name)!}
                      />
                    </Reveal>
                  </KozepFigyelo>

                  {merfoldko ? (
                    <div className="md:col-span-3">
                      <Milestone szam={merfoldko.szam} szoveg={merfoldko.szoveg} />
                    </div>
                  ) : null}
                </Fragment>
              )
            })}
          </main>

          <section className="kartya mt-12 p-5">
            <h2 className="font-display text-[1.5rem] leading-tight text-cream">Kik vagyunk?</h2>
            <p className="mt-2.5 text-[0.92rem] leading-relaxed text-cream/70">
              Budapesti diákok vagyunk. Nekünk is az volt, hogy "menjünk valahova", aztán "jó, de
              mennyibe kerül", aztán "akkor inkább nem". Most már nem így megy: végigjárjuk a várost,
              és kedvezményt szerzünk oda, ahova amúgy is mennél.
            </p>
          </section>

          <Subscribe />

          <footer className="mt-12 text-center">
            <p className="text-[0.95rem] leading-snug text-cream/70">
              Új helyek folyamatosan. Kövess minket, hogy elsőként tudd.
            </p>

            <div className="mt-5 flex gap-3">
              <a
                href="https://instagram.com/side_quest.bp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-[#0A0A0A]/80 px-4 py-3 text-[0.85rem] font-semibold text-cream transition active:scale-[0.98]"
              >
                <InstagramIcon className="h-5 w-5" />
                Instagram
              </a>
              <a
                href="https://tiktok.com/@side_quest.bp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/15 bg-[#0A0A0A]/80 px-4 py-3 text-[0.85rem] font-semibold text-cream transition active:scale-[0.98]"
              >
                <TikTokIcon className="h-5 w-5" />
                TikTok
              </a>
            </div>

            <p className="mt-9 text-[0.75rem] text-cream/60">Frissítve: 2026. szeptember</p>
          </footer>
        </div>
      </div>
    </div>
  )
}
