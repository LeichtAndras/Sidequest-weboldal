import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import partnersData from './data/partners.json'
import PartnerCard from './components/PartnerCard'
import CategoryFilter, { ALL } from './components/CategoryFilter'
import Reveal from './components/Reveal'
import Subscribe from './components/Subscribe'
import Header from './components/Header'
import Road, { type UtPont } from './components/Road'
import Milestone from './components/Milestone'
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

const toNumber = (discount: string) =>
  Number.parseFloat(discount.replace(/[^\d.,]/g, '').replace(',', '.'))

const topDiscount = Math.max(...partners.map((partner) => toNumber(partner.discount)))
// A szuro gombok sorrendje az eredeti listat koveti, nem az uj partnereket.
const categories = [...new Set(nyersPartnerek.map((partner) => partner.category))]

/** Harom merfoldko, minden harmadik kartya utan. */
const merfoldkovek = ['9 partner Budapesten', 'közel 10 000 követő', '4 hónap alatt']

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

  const utSavRef = useRef<HTMLDivElement>(null)
  const [utMagassag, setUtMagassag] = useState(0)
  const [utPontok, setUtPontok] = useState<UtPont[]>([])
  const utolsoPontok = useRef('')

  // Az ut a valodi elrendezesbol epul fel: a szuro alatt indul, minden
  // kartya mellett elhalad, es az oldal aljaig fut. Szures, lenyitas es
  // atmeretezes utan ujraszamoljuk.
  useEffect(() => {
    const sav = utSavRef.current
    if (!sav) return

    const merj = () => {
      const savDoboz = sav.getBoundingClientRect()
      const szelesseg = savDoboz.width || 1
      setUtMagassag(savDoboz.height)

      const relativY = (doboz: DOMRect) => doboz.top - savDoboz.top
      const kozepX = (doboz: DOMRect) =>
        ((doboz.left - savDoboz.left + doboz.width / 2) / szelesseg) * 100

      const pontok: UtPont[] = []

      // Kezdopont a szuro gombok alatt, hogy ne vagjon at rajtuk
      const nav = sav.querySelector('nav')
      const navDoboz = nav?.getBoundingClientRect()
      pontok.push({ x: 50, y: navDoboz ? relativY(navDoboz) + navDoboz.height + 22 : 0 })

      // Minden kartya mellett elhalad, a kartya valodi helyzete szerint
      const kartyak = [...sav.querySelectorAll('article[id^="partner-"]')]
      kartyak.forEach((kartya, index) => {
        const doboz = kartya.getBoundingClientRect()
        const teljesSzeles = doboz.width / szelesseg > 0.75
        const eltolas = teljesSzeles
          ? index % 2 === 0
            ? -19
            : 19
          : (kozepX(doboz) - 50) * 0.34
        const x = 50 + eltolas

        // A szamozott megallo a kartya folotti hezagba kerul, hogy telefonon
        // se takarja el a kartya. Az ut ugyanezen az x-en halad tovabb a
        // kartya mellett, igy a vonal iranya nem valtozik.
        pontok.push({ x, y: Math.max(relativY(doboz) - 28, 0), megallo: true })
        pontok.push({ x, y: relativY(doboz) + doboz.height / 2 })
      })

      // Az also dobozok mellett, a bal oldali savban halad el, nem alattuk
      // tunik el, es nem vag at rajtuk.
      const dobozok = [...sav.querySelectorAll('section')]
      dobozok.forEach((doboz) => {
        const d = doboz.getBoundingClientRect()
        pontok.push({ x: 17, y: relativY(d) + d.height / 2 })
      })

      pontok.push({ x: 24, y: savDoboz.height - 6 })

      // Csak akkor frissitunk, ha tenyleg valtozott valami. Igy a felesleges
      // ujrarajzolas es a geometria ujraszamolasa is elmarad.
      const ujjlenyomat = pontok
        .map((pont) => `${pont.x.toFixed(1)},${pont.y.toFixed(1)}`)
        .join('|')
      if (ujjlenyomat !== utolsoPontok.current) {
        utolsoPontok.current = ujjlenyomat
        setUtPontok(pontok)
      }
    }

    merj()

    // Lenyitas es bezaras kozben egyutt mozog az ut a kartyaval, nem utana ugrik be.
    let kovetesVege = performance.now() + 400
    const kovet = () => {
      merj()
      if (performance.now() < kovetesVege) window.requestAnimationFrame(kovet)
    }
    const kovetes = window.requestAnimationFrame(kovet)

    // A savot es minden kartyat kulon figyeljuk, mert a kartyak magassaga
    // kepbetoltestol es sortoresektol is valtozik.
    const figyelo = new ResizeObserver(merj)
    figyelo.observe(sav)
    sav.querySelectorAll('article[id^="partner-"], section').forEach((elem) => figyelo.observe(elem))

    const kepek = [...sav.querySelectorAll('img')]
    kepek.forEach((kep) => kep.addEventListener('load', merj))

    window.addEventListener('resize', merj)
    window.addEventListener('load', merj)
    const idozitok = [window.setTimeout(merj, 400), window.setTimeout(merj, 1200)]

    return () => {
      kovetesVege = 0
      window.cancelAnimationFrame(kovetes)
      figyelo.disconnect()
      kepek.forEach((kep) => kep.removeEventListener('load', merj))
      window.removeEventListener('resize', merj)
      window.removeEventListener('load', merj)
      idozitok.forEach(window.clearTimeout)
    }
  }, [category, openPartner])

  // Kartyankent egy allando fuggveny, kulonben minden meres utan
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
    <div className="min-h-dvh bg-ink">
      <Header />

      <div ref={utSavRef} className="relative">
        <Road magassag={utMagassag} pontok={utPontok} />

        <div className="relative mx-auto w-full max-w-[480px] px-5 pt-8 pb-10 md:max-w-[900px]">
          <nav aria-label="Kategóriák">
            <CategoryFilter categories={categories} active={category} onSelect={selectCategory} />
          </nav>

          <main key={category} className="mt-8 flex flex-col gap-11">
            {visible.map((partner, index) => {
              const merfoldko =
                category === ALL && (index + 1) % 3 === 0 ? merfoldkovek[(index + 1) / 3 - 1] : null

              return (
                <Fragment key={partner.name}>
                  <Reveal
                    delay={Math.min(index, 4) * 60}
                    className={index % 2 === 0 ? 'md:w-[46%] md:self-start' : 'md:w-[46%] md:self-end'}
                  >
                    <PartnerCard
                      partner={partner}
                      featured={toNumber(partner.discount) === topDiscount}
                      open={openPartner === partner.name}
                      onToggle={valtok.get(partner.name)!}
                    />
                  </Reveal>

                  {merfoldko ? <Milestone szoveg={merfoldko} /> : null}
                </Fragment>
              )
            })}
          </main>
        </div>

        <div className="relative mx-auto w-full max-w-[480px] px-5 pb-10">
        <section
          className="mt-12 rounded-2xl border-2 border-dashed border-cream/25 bg-surface p-5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
          style={{ transform: 'rotate(-0.7deg)' }}
        >
          <h2 className="font-display text-[1.05rem] leading-tight text-cream">Kik vagyunk?</h2>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-cream/70">
            Budapesti diákok vagyunk. Nekünk is az volt, hogy "menjünk valahova", aztán "jó, de
            mennyibe kerül", aztán "akkor inkább nem". Most már nem így megy: végigjárjuk a várost,
            és kedvezményt szerzünk oda, ahova amúgy is mennél.
          </p>
        </section>

        <Subscribe />

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
    </div>
  )
}
