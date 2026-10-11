import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import partnersData from '../data/partners.json'
import kategoriaSzo from '../data/kategoriak.json'
import type { Partner } from '../types'
import { ROBBANAS } from '../robbanas'
import { QrIcon, SpeechIcon, TagIcon } from './Icons'
import Felirat from './Felirat'
import Visszaszamlalo from './mozi/Visszaszamlalo'
import { felulirasok } from '../ajanlat/beallitas'
import { ajanlatRa, budapestiNap, kovetkezoEjfel, kovetkezoNap } from '../ajanlat/valasztas'
import { KATTINTAS, MEGJELENT, kovet } from '../ajanlat/esemeny'

const partnerek = partnersData as Partner[]

/*
 * A szerveren nincs useLayoutEffect, ott a React figyelmeztetne. A
 * bongeszoben viszont pont ez kell: a hidratalas utan meg a festes elott
 * valtunk a valodi mai napra, igy nem villan meg a build napjanak ajanlata.
 */
const hatasAzonnal = typeof window === 'undefined' ? useEffect : useLayoutEffect

/** Ugyanaz a harom lehetoseg, mint a helyszinkartyan, lasd ThumbCard. */
function bevaltasMod(partner: Partner) {
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
 * Mai ajanlat. Egy helyszin naponta, mindenkinek ugyanaz, budapesti nap
 * szerint. Alatta a holnapi ajanlat elmosott teaserrel es visszaszamlaloval,
 * ami ejfelkor magatol atvalt, oldalfrissites nelkul.
 *
 * A kartya a helyszinkartya vizualis nyelvet hasznalja: ugyanaz a hk-
 * keret, kategoria pirula, kedvezmeny robbanas es krem panel. Uj szin,
 * betu vagy arnyek nincs benne.
 */
export default function MaiAjanlat() {
  // A build napja. A szerveren es a bongeszo elso renderjeben is ez fut,
  // ezert a hidratalas pontosan illeszkedik.
  const [nap, setNap] = useState(__BUILD_NAP__)
  const [ejfel, setEjfel] = useState<number | null>(null)
  const doboz = useRef<HTMLElement>(null)
  const [kepHiba, setKepHiba] = useState(false)

  hatasAzonnal(() => {
    setNap(budapestiNap())
    setEjfel(kovetkezoEjfel())
  }, [])

  // Ejfelkor ujraszamolunk. Kis keses, hogy biztosan atlepjuk a hatart.
  const lejart = useCallback(() => {
    window.setTimeout(() => {
      setNap(budapestiNap())
      setEjfel(kovetkezoEjfel())
    }, 1200)
  }, [])

  const mai = useMemo(() => ajanlatRa(partnerek, nap, felulirasok), [nap])
  const holnapi = useMemo(() => ajanlatRa(partnerek, kovetkezoNap(nap), felulirasok), [nap])

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

  const bevaltas = bevaltasMod(mai)
  const kep = mai.venue && !kepHiba ? `/venues/${mai.venue}` : null
  const leiras = egySor(mai.description)

  return (
    <section className="ma-szekcio" aria-labelledby="mai-ajanlat-cim">
      <h2 id="mai-ajanlat-cim" className="ma-cim">
        <Felirat szoveg="Mit csináljunk ma?" />
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

          <div className="hk-kedvezmeny">
            <svg viewBox="0 0 140 100" aria-hidden="true">
              <path d={ROBBANAS} fill="#FF2D78" stroke="#0B1B3A" strokeWidth="3.4" strokeLinejoin="round" />
            </svg>
            <span className="hk-kedvezmeny-szoveg">
              <span className="hk-kedvezmeny-szam">{mai.discount}</span>
              <span className="hk-kedvezmeny-felirat">Kedvezmény</span>
            </span>
          </div>

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

      {holnapi ? (
        <div className="hk-kartya ma-teaser">
          <div className="ma-teaser-belso">
            <span className="hk-kategoria ma-teaser-cimke">Holnap</span>

            {/* Izelito csak akkor, ha tenyleg van. Kitalalt helykitolto nincs. */}
            {holnapi.izelito ? <p className="ma-teaser-izelito">{holnapi.izelito}</p> : null}

            <p className="ma-teaser-nev" aria-hidden="true">
              {holnapi.name}
            </p>

            <p className="ma-teaser-ora">
              <span className="ma-teaser-felirat">Feloldás:</span>{' '}
              {ejfel === null ? (
                <span className="mozi-ora-digit">--:--:--</span>
              ) : (
                <Visszaszamlalo cel={ejfel} valtozat="ejfel" onLejart={lejart} />
              )}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  )
}
