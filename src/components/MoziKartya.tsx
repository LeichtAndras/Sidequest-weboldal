import { useCallback, useEffect, useRef, useState } from 'react'
import Visszaszamlalo from './mozi/Visszaszamlalo'
import MoziReszletek from './mozi/MoziReszletek'
import RagadosSav from './mozi/RagadosSav'
import { beallitas, kezdet, vege } from '../mozi/beallitas'
import { useSzavazas } from '../mozi/useSzavazas'
import { ROBBANAS } from '../robbanas'

const KEP = '/images/mozi/sugarmozi-popcorn'
/** Ennyi szavazattol mutatjuk a szamot. Kevesebb gyengen nez ki. */
const SZAVAZAT_HATAR = 20
const UTOLSO_NAP = 24 * 60 * 60 * 1000

/** A hatarido olvashatoan, pl. "Vasárnap 23:59-ig". A beallitasbol szamol. */
function hataridoSzoveg() {
  const datum = new Date(beallitas.voteEnd)
  const nap = new Intl.DateTimeFormat('hu-HU', { weekday: 'long' }).format(datum)
  const ido = new Intl.DateTimeFormat('hu-HU', { hour: '2-digit', minute: '2-digit' }).format(datum)
  return `${nap.charAt(0).toUpperCase()}${nap.slice(1)} ${ido}-ig`
}

/**
 * A fooldal kiemelt blokkja: a filmszavazas. Felul a banner, alatta a
 * lenyilo szavazas, ugyanazzal a panellel es TOBB/VISSZA gombbal, mint a
 * helyszinkartyakon. Erkezeskor nyitva all, hogy a szavazas rogton
 * lathato legyen, de be lehet csukni.
 */
export default function MoziKartya() {
  const [utolsoNap, setUtolsoNap] = useState(false)
  const [kartyaLatszik, setKartyaLatszik] = useState(true)
  const [szavazasLatszik, setSzavazasLatszik] = useState(false)
  const [nyitva, setNyitva] = useState(true)
  // A toplistat csak akkor frissitjuk, amikor tenyleg latszik is
  const szavazas = useSzavazas({ frissitsen: szavazasLatszik && nyitva })
  const doboz = useRef<HTMLElement>(null)

  /*
   * A gorgeto fuggvenyek allando hivatkozasok, igy nem olvashatjak kozvetlenul
   * a nyitva allapotot. Ez a ref koveti, hogy kell-e elobb kinyitni a panelt.
   */
  const nyitvaRef = useRef(true)
  useEffect(() => {
    nyitvaRef.current = nyitva
  }, [nyitva])

  const valt = useCallback(() => setNyitva((elozo) => !elozo), [])

  // Betolteskor mar tudjuk, hogy az utolso napban vagyunk-e
  useEffect(() => {
    if (vege - Date.now() <= UTOLSO_NAP) setUtolsoNap(true)
  }, [])

  const utolsoNapLett = useCallback(() => setUtolsoNap(true), [])

  /**
   * Odagorget a szavazas szakaszhoz. Tobbszor is probalkozik, mert a lusta
   * kepek betoltodve meg arrebb tolhatjak a celpontot.
   *
   * Ha a panel zarva volt, elobb kinyitjuk, es az elso gorgetest kihagyjuk:
   * a nulla magas szakaszra ugrani csak oda-vissza rantana a lapot. A 420 ms
   * utani probalkozasok mar a 260 ms-os lenyilas utan futnak.
   *
   * A megszakito figyelok csak keses utan kapcsolodnak be: telefonon maga a
   * koppintas is erintest valt ki, az kulonben rogton leallitana a
   * korrekciokat, es a lap felutan maradna.
   */
  const ugrasSzavazashoz = useCallback(() => {
    const voltNyitva = nyitvaRef.current
    setNyitva(true)

    let megszakit = false
    const megall = () => {
      megszakit = true
    }
    const oda = () => {
      if (megszakit) return
      // Nem a keresomezore, hanem a lepesekre: igy latszik, hogyan mukodik
      const cel =
        document.getElementById('mozi-instrukciok') ?? document.getElementById('szavazas')
      cel?.scrollIntoView({ block: 'start' })
    }

    if (voltNyitva) oda()

    const figyeloIdozito = window.setTimeout(() => {
      window.addEventListener('wheel', megall, { passive: true, once: true })
      window.addEventListener('touchmove', megall, { passive: true, once: true })
    }, 400)

    const utemek = voltNyitva ? [120, 420, 900, 1600] : [320, 560, 1000, 1700]
    const idozitok = utemek.map((ms) => window.setTimeout(oda, ms))

    window.setTimeout(() => {
      window.clearTimeout(figyeloIdozito)
      window.removeEventListener('wheel', megall)
      window.removeEventListener('touchmove', megall)
      idozitok.forEach(window.clearTimeout)
    }, 2200)
  }, [])

  /*
   * A /#mozi es a /#szavazas cimre erkezve odagorgetunk. Tobbszor is
   * probalkozunk, mert a fejlec fotoi es a kartya kepe is mozgatjak a
   * celpontot, amig minden a helyere kerul. A hashchange-re is figyelunk,
   * hogy az oldalon beluli linkek is mukodjenek.
   */
  useEffect(() => {
    let takarit: (() => void) | null = null

    const inditas = () => {
      const hash = window.location.hash
      if (hash !== '#mozi' && hash !== '#szavazas') return

      // Zart panelben a szavazas szakasz nulla magas, elobb ki kell nyitni.
      if (hash === '#szavazas') setNyitva(true)

      takarit?.()
      let megszakit = false
      const megall = () => {
        megszakit = true
      }
      const oda = () => {
        if (megszakit) return
        // A #szavazas link is a lepesekre erkezik, ugyanoda, ahova a gomb
        const cel =
          hash === '#szavazas'
            ? (document.getElementById('mozi-instrukciok') ?? document.getElementById('szavazas'))
            : doboz.current
        cel?.scrollIntoView({ block: 'start' })
      }

      window.addEventListener('wheel', megall, { passive: true, once: true })
      window.addEventListener('touchmove', megall, { passive: true, once: true })
      window.addEventListener('keydown', megall, { once: true })
      window.addEventListener('load', oda)

      const kep = doboz.current?.querySelector('img')
      kep?.addEventListener('load', oda)

      const idozitok = [150, 500, 1000, 1800, 2800].map((kesleltetes) =>
        window.setTimeout(oda, kesleltetes),
      )

      takarit = () => {
        window.removeEventListener('wheel', megall)
        window.removeEventListener('touchmove', megall)
        window.removeEventListener('keydown', megall)
        window.removeEventListener('load', oda)
        kep?.removeEventListener('load', oda)
        idozitok.forEach(window.clearTimeout)
      }
    }

    inditas()
    window.addEventListener('hashchange', inditas)
    return () => {
      window.removeEventListener('hashchange', inditas)
      takarit?.()
    }
  }, [])

  /*
   * A ragados sav csak akkor jon elo, ha a teljes blokk kigorgott. A
   * szavazas szakasz a blokkon belul van, tehat amig az latszik, nincs sav.
   */
  useEffect(() => {
    const elem = doboz.current
    if (!elem) return
    const figyelo = new IntersectionObserver(
      ([bejegyzes]) => setKartyaLatszik(bejegyzes.isIntersecting),
      { threshold: 0 },
    )
    figyelo.observe(elem)
    return () => figyelo.disconnect()
  }, [])

  // A toplista frissitesehez tudnunk kell, latszik-e a szavazas szakasz
  useEffect(() => {
    const elem = document.getElementById('szavazas')
    if (!elem) return
    const figyelo = new IntersectionObserver(([bejegyzes]) =>
      setSzavazasLatszik(bejegyzes.isIntersecting),
    )
    figyelo.observe(elem)
    return () => figyelo.disconnect()
  }, [])

  const lezart = szavazas.lezart
  const mutatSzavazatot = szavazas.osszes >= SZAVAZAT_HATAR
  const savLatszik = !kartyaLatszik && szavazas.faz !== null && !lezart

  return (
    <>
    <section id="mozi" ref={doboz} className="hk-kartya mozi-kartya scroll-mt-4">
      <div className="hk-lap">
        <picture>
          <source
            type="image/webp"
            srcSet={`${KEP}_640.webp 640w, ${KEP}_1199.webp 1199w`}
            sizes="(min-width: 768px) 1080px, 92vw"
          />
          <img
            className="hk-foto"
            src={`${KEP}.jpg`}
            alt="A SugárMozi vetítőterme, a vásznon kérdőjel, előtérben két vödör popcorn"
            width={1199}
            height={1600}
            loading="lazy"
            decoding="async"
          />
        </picture>

        <div className="hk-arnyek" />

        <div className="hk-kedvezmeny">
          <svg viewBox="0 0 140 100" aria-hidden="true">
            <path d={ROBBANAS} fill="#FF2D78" stroke="#0B1B3A" strokeWidth="3.4" strokeLinejoin="round" />
          </svg>
          <span className="hk-kedvezmeny-szoveg">
            <span className="hk-kedvezmeny-szam">TE</span>
            <span className="hk-kedvezmeny-felirat">választod!</span>
          </span>
        </div>

        <div className="hk-also">
          <h2 className="hk-nev">SideQuest Moziest</h2>
          <p className="mozi-alcim">Szavazz, melyik filmet vetítsük a SugárMoziban!</p>

          <div className="hk-sor mozi-also-sor">
            <div className="mozi-pirulak">
              {lezart ? (
                <span className="hk-chip">A szavazás lezárult</span>
              ) : (
                <>
                  <span className={`mozi-ora-pirula${utolsoNap ? ' mozi-ora-pirula-surgos' : ''}`}>
                    <Visszaszamlalo
                      cel={szavazas.faz === 'elotte' ? kezdet : vege}
                      onLejart={szavazas.lejart}
                      onUtolsoNap={utolsoNapLett}
                      valtozat="rovid"
                    />
                  </span>
                  <span className="hk-chip">{hataridoSzoveg()}</span>
                </>
              )}

              {mutatSzavazatot ? (
                <span className="hk-chip">{szavazas.osszes} szavazat eddig</span>
              ) : null}
            </div>

            <button
              type="button"
              className="tn-kapszula hk-tobb mozi-fo-gomb"
              onClick={valt}
              aria-expanded={nyitva}
              aria-controls="mozi-reszletek"
            >
              <span className="tn-gomb-felirat tn-gomb-felirat-sotet mozi-gomb-felirat">
                {nyitva ? 'Vissza' : 'Több'}
              </span>
              <svg
                viewBox="0 0 24 24"
                width="1em"
                height="1em"
                aria-hidden="true"
                className="mozi-gomb-nyil"
                style={{
                  transform: nyitva ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms ease',
                }}
              >
                <path
                  d="M12 4v13m0 0 6-6m-6 6-6-6"
                  fill="none"
                  stroke="#0B1B3A"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Ugyanaz a lenyilo panel, mint a helyszinkartyakon */}
      <div
        id="mozi-reszletek"
        inert={!nyitva}
        className={`tn-panel ${nyitva ? 'tn-panel-nyitva' : ''}`}
      >
        <div>
          <div className="tn-panel-belso mozi-panel">
            <MoziReszletek szavazas={szavazas} teljesOra />
          </div>
        </div>
      </div>
    </section>

    <RagadosSav latszik={savLatszik} faz={szavazas.faz} onSzavazok={ugrasSzavazashoz} />
    </>
  )
}
