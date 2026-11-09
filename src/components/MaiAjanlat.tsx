import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import partnersData from '../data/partners.json'
import kategoriaSzo from '../data/kategoriak.json'
import type { Partner } from '../types'
import { QrIcon, SpeechIcon, TagIcon } from './Icons'
import Felirat from './Felirat'
import KedvezmenyJelveny from './KedvezmenyJelveny'
import { felulirasok } from '../ajanlat/beallitas'
import { ajanlatRa, budapestiNap, kovetkezoEjfel } from '../ajanlat/valasztas'
import { KATTINTAS, MEGJELENT, kovet } from '../ajanlat/esemeny'
import { useUjRendszer } from '../fiok/kapcsolo'

const partnerek = partnersData as Partner[]

/*
 * A szerveren nincs useLayoutEffect, ott a React figyelmeztetne. A
 * bongeszoben viszont pont ez kell: a hidratalas utan meg a festes elott
 * valtunk a valodi mai napra, igy nem villan meg a build napjanak ajanlata.
 */
const hatasAzonnal = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Ugyanaz a harom lehetoseg, mint a helyszinkartyan, lasd ThumbCard. */
function bevaltasMod(partner: Partner, uj = false) {
  // Az uj, fiokos rendszerben ket mod van: kassza vagy szemelyes kod
  if (uj) {
    return partner.redemptionMode === 'online_kod'
      ? { szoveg: 'Személyes kód', Ikon: TagIcon }
      : { szoveg: 'Beváltás a kasszánál', Ikon: TagIcon }
  }
  if (partner.code) return { szoveg: 'Online kuponkód', Ikon: TagIcon }
  if (partner.redeem.includes('QR')) return { szoveg: 'QR a helyszínen', Ikon: QrIcon }
  return { szoveg: 'Mondd: SideQuest', Ikon: SpeechIcon }
}

/** Pl. "Sugár Bowling, bowlingpálya Budapesten", mint a ThumbCard-on. */
function kepLeiras(partner: Partner) {
  const szo = (kategoriaSzo as Record<string, string>)[partner.category] ?? partner.category.toLowerCase()
  return `${partner.name}, ${szo} Budapesten`
}

/** A kisebb valtozat fajlneve: "base-bar.webp" -> "base-bar-640.webp". */
const kisebbKep = (fajl: string) => fajl.replace(/\.webp$/, '-640.webp')

/** A leiras elso mondata, egy sorba. Tobb bekezdesbol is csak az elso. */
function egySor(szoveg?: string) {
  if (!szoveg) return ''
  const elso = szoveg.split('\n')[0].trim()
  const mondat = elso.match(/^[^.!?]+[.!?]/)
  return (mondat ? mondat[0] : elso).trim()
}

/**
 * Mai Quest. Egy helyszin naponta, mindenkinek ugyanaz, budapesti nap
 * szerint. Ejfelkor magatol atvalt, oldalfrissites nelkul.
 *
 * A kartya a helyszinkartya vizualis nyelvet hasznalja: ugyanaz a hk-
 * keret, kategoria pirula, kedvezmeny robbanas es krem panel. Uj szin,
 * betu vagy arnyek nincs benne.
 */
export default function MaiAjanlat() {
  // A build napja. A szerveren es a bongeszo elso renderjeben is ez fut,
  // ezert a hidratalas pontosan illeszkedik.
  const [nap, setNap] = useState(__BUILD_NAP__)
  const doboz = useRef<HTMLElement>(null)
  const [kepHiba, setKepHiba] = useState(false)

  const frissit = useCallback(() => setNap(budapestiNap()), [])

  hatasAzonnal(() => {
    frissit()
  }, [frissit])

  /*
   * Ejfelkor atvaltunk. A kis raadas azert kell, hogy biztosan atlepjuk a
   * hatart. Hatterbe tett fulon a bongeszo lassithatja az idozitot, ezert
   * elotunesre is ujraszamolunk.
   */
  useEffect(() => {
    const varakozas = Math.max(kovetkezoEjfel() - Date.now(), 0) + 1200
    const ido = window.setTimeout(frissit, varakozas)
    const elotunt = () => {
      if (document.visibilityState === 'visible') frissit()
    }
    document.addEventListener('visibilitychange', elotunt)
    return () => {
      window.clearTimeout(ido)
      document.removeEventListener('visibilitychange', elotunt)
    }
  }, [nap, frissit])

  const mai = useMemo(() => ajanlatRa(partnerek, nap, felulirasok), [nap])
  const uj = useUjRendszer(mai ?? undefined)

  // Megjelenes esemeny: akkor szol, amikor a kartya tenyleg lathatova valt.
  const szoltRol = useRef<string | null>(null)
  useEffect(() => {
    const elem = doboz.current
    if (!elem || !mai) return
    const figyelo = new IntersectionObserver(
      ([bejegyzes]) => {
        if (!bejegyzes.isIntersecting) return
        if (szoltRol.current === mai.slug) return
        szoltRol.current = mai.slug
        kovet(MEGJELENT, { slug: mai.slug })
      },
      { threshold: 0.4 },
    )
    figyelo.observe(elem)
    return () => figyelo.disconnect()
  }, [mai])

  if (!mai) return null

  const bevaltas = bevaltasMod(mai, uj)
  const kep = mai.venue && !kepHiba ? `/venues/${mai.venue}` : null
  const leiras = egySor(mai.description)

  return (
    <section className="ma-szekcio" aria-labelledby="mai-quest-cim">
      <h2 id="mai-quest-cim" className="ma-cim">
        <Felirat szoveg="Mai Quest" />
      </h2>

      <article ref={doboz} className="hk-kartya ma-kartya">
        <div className="hk-lap">
          {/* A picture asztalon a bal oszlop, lasd .ma-kartya a CSS-ben */}
          {kep ? (
            <picture>
              <img
                className="hk-foto"
                src={kep}
                srcSet={`/venues/${kisebbKep(mai.venue!)} 640w, ${kep} 960w`}
                sizes="(min-width: 768px) 460px, 92vw"
                alt={kepLeiras(mai)}
                decoding="async"
                onError={() => setKepHiba(true)}
              />
            </picture>
          ) : null}

          <div className="hk-arnyek" />

          <span className="hk-kategoria">{mai.category}</span>

          <KedvezmenyJelveny partner={mai} />

          <div className="hk-also">
            <h3 className="hk-nev">{mai.name}</h3>
            <div className="hk-sor">
              <span className="hk-chip">
                <bevaltas.Ikon className="hk-chip-ikon" />
                {bevaltas.szoveg}
              </span>
            </div>
          </div>
        </div>

        <div className="tn-panel-belso ma-panel">
          {leiras ? <p className="tn-panel-szoveg">{leiras}</p> : null}

          <a
            className="tn-kapszula ma-gomb"
            href={`/${mai.slug}/`}
            onClick={() => kovet(KATTINTAS, { slug: mai.slug })}
          >
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Megnézem</span>
            <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" className="ma-gomb-nyil">
              <path
                d="M4 12h13m0 0-6-6m6 6-6 6"
                fill="none"
                stroke="#0B1B3A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>
      </article>
    </section>
  )
}
