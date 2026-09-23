import { useEffect, useMemo, useState } from 'react'
import partnersData from './data/partners.json'
import PartnerCard from './components/PartnerCard'
import CategoryFilter, { ALL } from './components/CategoryFilter'
import Reveal from './components/Reveal'
import { InstagramIcon, TikTokIcon } from './components/Icons'
import type { Partner } from './types'
import { slugFromPath } from './site'

const partners = partnersData as Partner[]

const toNumber = (discount: string) =>
  Number.parseFloat(discount.replace(/[^\d.,]/g, '').replace(',', '.'))

const topDiscount = Math.max(...partners.map((partner) => toNumber(partner.discount)))
const categories = [...new Set(partners.map((partner) => partner.category))]

/** A cimsorbol indulunk: /magic-rooms/ eseten ez a kartya nyilik ki. */
function partnerACimbol() {
  if (typeof window === 'undefined') return null
  const slug = slugFromPath(window.location.pathname)
  return partners.find((partner) => partner.slug === slug) ?? null
}

export default function App() {
  const [openPartner, setOpenPartner] = useState<string | null>(() => partnerACimbol()?.name ?? null)
  const [category, setCategory] = useState(ALL)

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

  function selectCategory(next: string) {
    setCategory(next)
    setOpenPartner(null)
  }

  return (
    <div className="min-h-dvh bg-ink">
      <div className="mx-auto w-full max-w-[480px] px-5 pt-10 pb-10">
        <header className="text-center">
          <img
            src="/sidequest-logo.png"
            alt="SideQuest"
            width={180}
            height={177}
            fetchPriority="high"
            className="mx-auto h-auto w-[180px] mix-blend-screen"
          />
          <p className="mt-2 text-[1.02rem] text-cream/70">Budapest legjobb helyei, olcsóbban.</p>
          <p className="mt-1.5 text-[0.85rem] font-medium text-accent">
            {partners.length} hely Budapesten, akár {topDiscount}% kedvezménnyel
          </p>
          <div className="mx-auto mt-6 h-px w-16 bg-accent/50" />
        </header>

        <nav aria-label="Kategóriák" className="mt-6">
          <CategoryFilter categories={categories} active={category} onSelect={selectCategory} />
        </nav>

        <main key={category} className="mt-5 flex flex-col gap-3.5">
          {visible.map((partner, index) => (
            <Reveal key={partner.name} delay={Math.min(index, 4) * 60}>
              <PartnerCard
                partner={partner}
                featured={toNumber(partner.discount) === topDiscount}
                open={openPartner === partner.name}
                onToggle={() =>
                  setOpenPartner((current) => (current === partner.name ? null : partner.name))
                }
              />
            </Reveal>
          ))}
        </main>

        <section className="mt-12 rounded-2xl border border-line bg-surface p-5">
          <h2 className="text-[1.25rem] font-semibold text-cream">Kik vagyunk?</h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/70">
            Budapesti diákok vagyunk, akik unták, hogy mindig ugyanoda megyünk. Elkezdtük felkutatni
            a város legjobb helyeit, és megmutatni őket TikTokon és Instagramon. Most a
            partnereinkkel azon dolgozunk, hogy ezek a helyek neked olcsóbbak is legyenek.
          </p>
        </section>

        <footer className="mt-12 text-center">
          <p className="text-[0.98rem] leading-snug text-cream/70">
            Új helyek folyamatosan. Kövess minket, hogy elsőként tudd.
          </p>

          <div className="mt-5 flex gap-3">
            <a
              href="https://instagram.com/side_quest.bp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 font-semibold text-ink transition active:scale-[0.98]"
            >
              <InstagramIcon className="h-5 w-5" />
              Instagram
            </a>
            <a
              href="https://tiktok.com/@side_quest.bp"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-accent/60 px-4 py-3.5 font-semibold text-cream transition active:scale-[0.98]"
            >
              <TikTokIcon className="h-5 w-5" />
              TikTok
            </a>
          </div>

          <p className="mt-9 text-[0.75rem] text-cream/70">Frissítve: 2026. szeptember</p>
        </footer>
      </div>
    </div>
  )
}
