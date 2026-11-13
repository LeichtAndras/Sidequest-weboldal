import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { gorgetesZarolasa } from './fiok/gorgetesZar'
import { createPortal } from 'react-dom'
import CouponCode from './components/CouponCode'
import BelepesAblak from './components/fiok/BelepesAblak'
import AjandekKartya, { legnagyobbSzazalek, szazalek } from './components/fiok/AjandekKartya'
import {
  FiokHiba,
  belepesNyitasa,
  useFiok,
  valaszthat,
  welcomeAllapot,
  welcomeValasztasa,
  type Igenyles,
} from './fiok/fiok'
import { hataridoNap, kinalatFrissitese, useKinalat, type Ajanlat } from './fiok/kinalat'

/**
 * A welcome ajandek valasztasa. Regisztracio utan ide jon a user, es a
 * Fiokom oldalrol is elerheto, amig nem valasztott. Ugyanazok a kartyak es
 * ugyanaz a krem lap, mint a regisztracios popupban (AjandekKartya, ap-
 * osztalyok), hogy regisztracio elott es utan ugyanazt lassa a user.
 * Koppintasra a kartya kijelolodik, alul megjelenik a gomb, a vegleges
 * valasztas elott megerosito lap jon. Hogy jar-e meg darab, a szerver donti el.
 */

const ROVID_HONAP = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', month: 'short' })

/** "dec. 1-től": az uj keret kezdete, rovid honappal. */
const ujKeretRovid = (ujKeret: string) =>
  `${ROVID_HONAP.format(new Date(`${ujKeret}T12:00:00Z`)).replace(/\.?$/, '.')} 1-től`

/** Konfetti darabok: allando, kozel veletlen iranyok es szinek. */
const KONFETTI = Array.from({ length: 28 }, (_, i) => ({
  x: Math.round(Math.sin(i * 12.9898) * 160),
  y: -Math.round(140 + ((i * 37) % 120)),
  r: (i * 47) % 360,
  szin: ['#FF2D78', '#36B9F0', '#FFC93C', '#3DDC97'][i % 4],
  kesik: (i % 7) * 0.025,
}))

/** A popup gombjanak nyila. */
function Nyil() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Cim a popup stilusaban: a Felirat sotet valtozatanak osztalyai. */
function Cim({ szoveg, id }: { szoveg: string; id?: string }) {
  return (
    <h2 id={id} className="tn-panel-cim ap-cim">
      <span className="tn-felirat tn-felirat-kicsi tn-felirat-sotet mozi-fejlec">
        <span className="tn-felirat-elso">{szoveg}</span>
      </span>
    </h2>
  )
}

export default function Ajandek() {
  const fiok = useFiok()
  const kinalat = useKinalat()
  const [kijelolt, setKijelolt] = useState<number | null>(null)
  const [kerdes, setKerdes] = useState<Ajanlat | null>(null)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)
  // A megerosito lapon a sikeres valasztas utan ugyanott jon a "Megvan!"
  const [siker, setSiker] = useState(false)
  // A konfetti a lapon levo kartyabol robban ki: annak a kozepet merjuk meg
  const lapKartya = useRef<HTMLDivElement>(null)
  const [konfettiHely, setKonfettiHely] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    if (!siker || !lapKartya.current) return
    const t = lapKartya.current.getBoundingClientRect()
    setKonfettiHely({ x: t.left + t.width / 2, y: t.top + t.height / 2 })
  }, [siker])

  // Friss darabszamok minden megnyitaskor
  useEffect(() => {
    void kinalatFrissitese()
  }, [])

  useEffect(() => {
    if (!kerdes) return
    // iOS-on is biztos zar, lasd gorgetesZar.ts
    const feloldas = gorgetesZarolasa()
    return () => {
      feloldas()
    }
  }, [kerdes])

  const valaszt = async (a: Ajanlat) => {
    setDolgozik(true)
    setHiba(null)
    try {
      await welcomeValasztasa(a.id)
      // A lap nyitva marad, es a "Megvan!" allapotra valt
      setSiker(true)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a választás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  // A lap bezarasa (Mégsem, hatter, Escape). Siker utan a lap tetejere
  // gorgetunk, ahol mar a valasztott ajandek all.
  const lapBezarasa = () => {
    if (dolgozik) return
    if (siker) {
      setSiker(false)
      setKijelolt(null)
      setKerdes(null)
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
      return
    }
    setKerdes(null)
  }

  useEffect(() => {
    if (!kerdes) return
    const billentyu = (e: KeyboardEvent) => {
      if (e.key === 'Escape') lapBezarasa()
    }
    window.addEventListener('keydown', billentyu)
    return () => window.removeEventListener('keydown', billentyu)
  })

  const w = welcomeAllapot(fiok.igenylesek)
  // Az elfogyott ajanlatok a lista vegere kerulnek (a sorrend kulonben marad)
  const ajanlatok = (kinalat?.ajanlatok ?? [])
    .filter((a) => a.tipus === 'welcome')
    .sort((x, y) => Number(x.szabad < 1) - Number(y.szabad < 1))
  const max = legnagyobbSzazalek(ajanlatok)
  const betolt =
    fiok.allapot === 'ismeretlen' ||
    (fiok.allapot === 'bent' && (fiok.email === null || (fiok.keresztnev !== null && w === null)))
  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null
  const sajat = w?.igenyles ?? null
  const valasztas = belepve && valaszthat(w)
  // Ha kozben elfogyott, a kijeloles nem marad meg
  const kijeloltAjanlat = ajanlatok.find((a) => a.id === kijelolt && a.szabad > 0) ?? null
  const napok = new Set(ajanlatok.map((a) => a.ervenyes_nap))
  const nap = napok.size === 1 ? [...napok][0] : null

  // A valasztott ajandek kartyaja (megvan allapot)
  const sajatKartya = sajat
    ? (kinalat?.ajanlatok.find((a) => a.id === sajat.offer_id) ?? {
        partner_slug: sajat.partner_slug,
        partner: partnerNev(kinalat?.ajanlatok ?? [], sajat.partner_slug) ?? sajat.partner_slug,
        szoveg: sajat.szoveg,
        jelveny: null,
        keret: 0,
        szabad: 0,
      })
    : null

  return (
    <div className="relative min-h-dvh aj-oldal">
      <div className="oldal-hatter" />
      <div className="aj-sotetito" aria-hidden="true" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <div
          className={`relative z-10 mx-auto w-full max-w-[480px] px-4 pt-10 md:max-w-[640px] ${
            valasztas && kijeloltAjanlat ? 'pb-32' : 'pb-12'
          }`}
        >
          <a href="/" className="mozi-vissza">
            Vissza a SideQuest oldalára
          </a>

          <h1 className="mozi-cim">Üdvözlő ajándék</h1>

          <div className="mozi-oldal-panel aj-panel">
            <div className="tn-panel-belso mozi-panel ap-belso aj-belso">
              {betolt ? <p className="ap-szoveg">Betöltés...</p> : null}

              {fiok.allapot === 'kint' ? (
                <>
                  <p className="ap-cimke">Ingyenes · csak e-mail kell</p>
                  <Cim szoveg="Lépj be az ajándékodért" />
                  <p className="ap-szoveg">Lépj be, és válassz egy helyet, ahol egy alkalommal nagyobb kedvezményt kapsz.</p>
                  <button type="button" className="tn-kapszula mozi-gomb ap-cta" onClick={belepesNyitasa}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Belépés</span>
                    <Nyil />
                  </button>
                </>
              ) : null}

              {fiok.allapot === 'bent' && fiok.keresztnev === null && fiok.email !== null ? (
                <>
                  <Cim szoveg="Még egy lépés" />
                  <p className="ap-szoveg">Add meg a keresztneved, ehhez kell az ajándék beváltásához.</p>
                  <button type="button" className="tn-kapszula mozi-gomb ap-cta" onClick={belepesNyitasa}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Kitöltöm</span>
                    <Nyil />
                  </button>
                </>
              ) : null}

              {belepve && w?.statusz === 'aktiv' && sajat && sajatKartya ? (
                <>
                  <p className="ap-cimke">Megvan!</p>
                  <Cim szoveg="Ez az ajándékod" />
                  <div className="ap-lista">
                    <AjandekKartya
                      ajanlat={sajatKartya}
                      max={szazalek(sajatKartya)}
                      statikus
                      alsoSor={`${hataridoNap(sajat.lejarat)}-ig váltsd be`}
                    />
                  </div>
                  <p className="ap-szoveg">A hely kártyáján találod a beváltás gombját.</p>
                  <a className="tn-kapszula mozi-gomb ap-cta" href={`/${sajat.partner_slug}/`}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Irány a beváltás</span>
                    <Nyil />
                  </a>
                </>
              ) : null}

              {belepve && w?.statusz === 'bevaltott' && sajat ? (
                sajat.kod && Date.parse(sajat.lejarat) > Date.now() ? (
                  <>
                    <p className="ap-cimke">Megvan!</p>
                    <Cim szoveg="Ez a kódod" />
                    <p className="ap-szoveg">
                      {sajatKartya?.partner}: {sajat.szoveg}. Foglaláskor írd be, {hataridoNap(sajat.lejarat)}-ig
                      érvényes.
                    </p>
                    <CouponCode code={sajat.kod} />
                    <p className="bev-egy-kod">1 kód / foglalás</p>
                  </>
                ) : (
                  <>
                    <Cim szoveg="Már beváltottad" />
                    <p className="ap-szoveg">
                      Az üdvözlő ajándékodat már beváltottad ({sajat.szoveg}). A többi helyen az alap kedvezmény jár.
                    </p>
                  </>
                )
              ) : null}

              {valasztas ? (
                <>
                  <p className="ap-cimke">Egyszer választhatsz</p>
                  <Cim szoveg="Válaszd ki az ajándékod" />
                  <p className="ap-szoveg">
                    {w?.statusz === 'lejart'
                      ? 'A korábbi ajándékod lejárt, mert nem váltottad be időben. Válassz újat.'
                      : `Egy helyet választhatsz${nap ? `, és ${nap} napod lesz beváltani` : ''}.`}
                  </p>

                  {kinalat === null ? <p className="ap-szoveg">Betöltés...</p> : null}
                  {kinalat !== null && ajanlatok.length === 0 ? (
                    <p className="ap-szoveg">Most nincs választható ajándék. Nézz vissza később.</p>
                  ) : null}

                  <ul className={`ap-lista${kijeloltAjanlat ? ' ap-lista-van-kijelolt' : ''}`}>
                    {ajanlatok.map((a, i) => {
                      const elfogyott = a.szabad < 1
                      const kijelolve = kijeloltAjanlat?.id === a.id
                      return (
                        <li key={a.id} style={{ '--ap-sor': i } as CSSProperties}>
                          <AjandekKartya
                            ajanlat={a}
                            max={max}
                            kijelolt={kijelolve}
                            elfogyott={elfogyott}
                            alsoSor={elfogyott && kinalat ? `Elfogyott · ${ujKeretRovid(kinalat.uj_keret)} újra` : undefined}
                            disabled={dolgozik}
                            onClick={() => {
                              setHiba(null)
                              setKijelolt(kijelolve ? null : a.id)
                            }}
                          />
                        </li>
                      )
                    })}
                  </ul>

                  {hiba && !kerdes ? <p className="mozi-hiba">{hiba}</p> : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Ragados gomb alul, amig van kijelolt kartya */}
      {valasztas && kijeloltAjanlat && !kerdes ? (
        <div className="aj-cta-sav">
          <button
            type="button"
            className="tn-kapszula mozi-gomb ap-cta"
            onClick={() => {
              setHiba(null)
              setKerdes(kijeloltAjanlat)
            }}
          >
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">
              Ezt választom · {szazalek(kijeloltAjanlat) !== null ? `${szazalek(kijeloltAjanlat)}%` : kijeloltAjanlat.szoveg}
            </span>
            <Nyil />
          </button>
        </div>
      ) : null}

      {kerdes
        ? createPortal(
            <div
              className="fiok-retes ap-retes aj-lap-retes"
              role="dialog"
              aria-modal="true"
              aria-labelledby="aj-lap-cim"
              onClick={(e) => {
                if (e.target === e.currentTarget) lapBezarasa()
              }}
            >
              <div className="fiok-lap mozi-oldal-panel ap-lap">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso ap-belso">
                  <span className="ap-fogo" aria-hidden="true" />
                  <button type="button" className="fiok-zaro" onClick={lapBezarasa} aria-label="Bezárás" disabled={dolgozik}>
                    <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  </button>

                  {siker ? (
                    <SikerTartalom ajanlat={kerdes} igenyles={w?.igenyles ?? null} onBezar={lapBezarasa} />
                  ) : (
                    <Cim szoveg="Biztos ezt választod?" id="aj-lap-cim" />
                  )}

                  {/* A hos: ugyanaz a kartya, mint a listaban */}
                  <div ref={lapKartya} className="aj-lap-hos">
                    <AjandekKartya
                      ajanlat={kerdes}
                      max={max}
                      statikus
                      alsoSor={siker && w?.igenyles ? `${hataridoNap(w.igenyles.lejarat)}-ig váltsd be` : undefined}
                    />
                  </div>

                  {siker ? (
                    <SikerGombok ajanlat={kerdes} igenyles={w?.igenyles ?? null} onBezar={lapBezarasa} />
                  ) : (
                    <>
                      <div className="ap-pirulak">
                        <span className="ap-cimke">
                          {kerdes.mod === 'online_kod' ? 'Rögtön megkapod a kódot' : `${kerdes.ervenyes_nap} napig beváltható`}
                        </span>
                        <span className="ap-cimke ap-cimke-halvany">
                          {kerdes.mod === 'online_kod' ? 'Online foglalásnál' : 'Pultnál'}
                        </span>
                      </div>
                      <p className="ap-szoveg">Csak egyszer választhatsz, utána nem módosítható.</p>
                      {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
                      <button
                        type="button"
                        className="tn-kapszula mozi-gomb ap-cta"
                        onClick={() => void valaszt(kerdes)}
                        disabled={dolgozik}
                        aria-busy={dolgozik}
                      >
                        {dolgozik ? (
                          <>
                            <span className="ap-porgo" aria-hidden="true" />
                            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Pillanat...</span>
                          </>
                        ) : (
                          <>
                            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">
                              Ezt választom · {szazalek(kerdes) !== null ? `${szazalek(kerdes)}%` : kerdes.szoveg}
                            </span>
                            <Nyil />
                          </>
                        )}
                      </button>
                      <div className="fiok-masodlagos ap-also">
                        <button type="button" className="fiok-szoveggomb" onClick={lapBezarasa} disabled={dolgozik}>
                          Mégsem
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Rovid konfetti a kartyabol; mozgascsokkentesnel nem latszik */}
              {siker && konfettiHely ? (
                <div className="aj-konfetti" style={{ left: konfettiHely.x, top: konfettiHely.y }} aria-hidden="true">
                  {KONFETTI.map((k, i) => (
                    <span
                      key={i}
                      style={
                        {
                          '--k-x': `${k.x}px`,
                          '--k-y': `${k.y}px`,
                          '--k-r': `${k.r}deg`,
                          '--k-kesik': `${k.kesik}s`,
                          backgroundColor: k.szin,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      <BelepesAblak />
    </div>
  )
}

/** A lap "Megvan!" cime es szovege (a kartya folott). */
function SikerTartalom({ ajanlat, igenyles }: { ajanlat: Ajanlat; igenyles: Igenyles | null; onBezar: () => void }) {
  return (
    <>
      <p className="ap-cimke">Megvan!</p>
      <Cim szoveg="Megvan! 🎉" id="aj-lap-cim" />
      <p className="ap-szoveg">
        {ajanlat.mod === 'online_kod'
          ? 'Foglaláskor írd be a kódodat. A Fiókom oldalon is megtalálod.'
          : igenyles
            ? `${hataridoNap(igenyles.lejarat)}-ig váltsd be a pultnál.`
            : 'A hely kártyáján találod a beváltás gombját.'}
      </p>
    </>
  )
}

/** A lap "Megvan!" gombjai (a kartya alatt): online kodnal a kod is. */
function SikerGombok({ ajanlat, igenyles, onBezar }: { ajanlat: Ajanlat; igenyles: Igenyles | null; onBezar: () => void }) {
  const online = ajanlat.mod === 'online_kod'
  return (
    <>
      {online && igenyles?.kod ? <CouponCode code={igenyles.kod} /> : null}
      <a className="tn-kapszula mozi-gomb ap-cta" href={online ? '/fiokom/' : `/${ajanlat.partner_slug}/`}>
        <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{online ? 'Irány a Fiókom' : 'Irány a beváltás'}</span>
        <Nyil />
      </a>
      <div className="fiok-masodlagos ap-also">
        <button type="button" className="fiok-szoveggomb" onClick={onBezar}>
          Bezárás
        </button>
        {online ? null : (
          <a className="ap-megjegyzes" href="/fiokom/">
            Fiókom
          </a>
        )}
      </div>
    </>
  )
}

/** A partner neve a kinalatbol (a claims sor csak a slugot tudja). */
function partnerNev(ajanlatok: Ajanlat[], slug: string): string | null {
  return ajanlatok.find((a) => a.partner_slug === slug)?.partner ?? null
}
