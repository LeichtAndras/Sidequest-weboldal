import { useCallback, useEffect, useId, useRef, useState } from 'react'
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
 * A fooldal kiemelt blokkja: a filmszavazas, a partner kartyak felepitesevel.
 * Ugyanazok a hk- osztalyok, csak szelesebb es laposabb, plusz a hataridore
 * figyelmezteto jelek: matrica szalag, pink cimke es ketyego visszaszamlalo.
 */
export default function MoziKartya() {
  const [nyitva, setNyitva] = useState(false)
  const [utolsoNap, setUtolsoNap] = useState(false)
  const szavazas = useSzavazas({ frissitsen: nyitva })
  const panelId = useId()
  const doboz = useRef<HTMLElement>(null)

  // Betolteskor mar tudjuk, hogy az utolso napban vagyunk-e
  useEffect(() => {
    if (vege - Date.now() <= UTOLSO_NAP) setUtolsoNap(true)
  }, [])

  const utolsoNapLett = useCallback(() => setUtolsoNap(true), [])

  const [bannerLatszik, setBannerLatszik] = useState(true)
  const [szavazasLatszik, setSzavazasLatszik] = useState(false)
  const lap = useRef<HTMLDivElement>(null)

  /**
   * Odagorget a szavazas szakaszhoz. Tobbszor is probalkozik, mert a lusta
   * kepek betoltodve meg arrebb tolhatjak, es a lenyilas is animalt.
   */
  const ugrasSzavazashoz = useCallback(() => {
    setNyitva(true)
    let megszakit = false
    const megall = () => {
      megszakit = true
    }
    // Azonnali gorgetes, nem sima: a tobbszori probalkozas kulonben
    // egymast szakitana meg, es felemas helyen allna meg az oldal.
    const oda = () => {
      if (megszakit) return
      document.getElementById('szavazas')?.scrollIntoView({ block: 'start' })
    }
    window.addEventListener('wheel', megall, { passive: true, once: true })
    window.addEventListener('touchstart', megall, { passive: true, once: true })
    const idozitok = [80, 320, 600, 1100, 1800].map((ms) => window.setTimeout(oda, ms))
    window.setTimeout(() => {
      window.removeEventListener('wheel', megall)
      window.removeEventListener('touchstart', megall)
      idozitok.forEach(window.clearTimeout)
    }, 2200)
  }, [])

  /*
   * A /#mozi es a /#szavazas cimre erkezve magatol kinyilik es odagorgetunk.
   * Tobbszor is probalkozunk, mert a fejlec fotoi es a lenyilo resz is
   * mozgatjak a kartyat, amig minden a helyere kerul. Ha a latogato kozben
   * maga gorget, abbahagyjuk.
   */
  useEffect(() => {
    const hash = window.location.hash
    if (hash !== '#mozi' && hash !== '#szavazas') return
    setNyitva(true)

    let megszakit = false
    const megall = () => {
      megszakit = true
    }
    const oda = () => {
      if (megszakit) return
      const cel = hash === '#szavazas' ? document.getElementById('szavazas') : doboz.current
      cel?.scrollIntoView({ block: 'start' })
    }

    window.addEventListener('wheel', megall, { passive: true, once: true })
    window.addEventListener('touchstart', megall, { passive: true, once: true })
    window.addEventListener('keydown', megall, { once: true })
    window.addEventListener('load', oda)

    const idozitok = [150, 500, 1000, 1800, 2600].map((kesleltetes) =>
      window.setTimeout(oda, kesleltetes),
    )

    return () => {
      window.removeEventListener('wheel', megall)
      window.removeEventListener('touchstart', megall)
      window.removeEventListener('keydown', megall)
      window.removeEventListener('load', oda)
      idozitok.forEach(window.clearTimeout)
    }
  }, [])

  // A ragados sav akkor jon, ha a banner mar kigorgott es a szavazas sem latszik
  useEffect(() => {
    const elem = lap.current
    if (!elem) return
    const figyelo = new IntersectionObserver(
      ([bejegyzes]) => setBannerLatszik(bejegyzes.isIntersecting),
      { rootMargin: '0px 0px -40px 0px' },
    )
    figyelo.observe(elem)
    return () => figyelo.disconnect()
  }, [])

  useEffect(() => {
    if (!nyitva) {
      setSzavazasLatszik(false)
      return
    }
    const elem = document.getElementById('szavazas')
    if (!elem) return
    const figyelo = new IntersectionObserver(([bejegyzes]) => setSzavazasLatszik(bejegyzes.isIntersecting))
    figyelo.observe(elem)
    return () => figyelo.disconnect()
  }, [nyitva])

  const savLatszik = !bannerLatszik && !szavazasLatszik && szavazas.faz !== null && !szavazas.lezart

  // Amig a sav latszik, az oldal aljara annyi hely kell, amennyit eltakar
  useEffect(() => {
    document.body.classList.toggle('mozi-sav-helye', savLatszik)
    return () => document.body.classList.remove('mozi-sav-helye')
  }, [savLatszik])

  const lezart = szavazas.lezart
  const mutatSzavazatot = szavazas.osszes >= SZAVAZAT_HATAR

  return (
    <section id="mozi" ref={doboz} className="hk-kartya mozi-kartya scroll-mt-4">
      <div className="hk-lap" ref={lap}>
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
              onClick={() => (nyitva ? setNyitva(false) : ugrasSzavazashoz())}
              aria-expanded={nyitva}
              aria-controls={panelId}
            >
              <span className="tn-gomb-felirat tn-gomb-felirat-sotet mozi-gomb-felirat">
                {nyitva ? 'Vissza' : 'Szavazok'}
              </span>
              <svg
                viewBox="0 0 24 24"
                width="1em"
                height="1em"
                aria-hidden="true"
                className="mozi-gomb-nyil"
                style={{ transform: nyitva ? 'rotate(180deg)' : 'none' }}
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

      <RagadosSav latszik={savLatszik} faz={szavazas.faz} onSzavazok={ugrasSzavazashoz} />

      <div id={panelId} inert={!nyitva} className={`tn-panel ${nyitva ? 'tn-panel-nyitva' : ''}`}>
        <div>
          <div className="tn-panel-belso mozi-panel">
            <MoziReszletek szavazas={szavazas} teljesOra />
          </div>
        </div>
      </div>
    </section>
  )
}
