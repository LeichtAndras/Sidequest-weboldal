import { useEffect, useId, useState } from 'react'
import { gorgetesZarolasa } from '../../fiok/gorgetesZar'
import { belepesNyitasaAjandekkal, useFiok } from '../../fiok/fiok'
import { alapAjanlat, useKinalat } from '../../fiok/kinalat'
import AjandekKartya, { legnagyobbSzazalek, szazalek } from './AjandekKartya'

const KULCS = 'sq-ajandek-popup'
/** Bezaras utan ennyi ideig nem jon fel ujra: egy nap. */
const SZUNET = 24 * 60 * 60 * 1000
/** Ezeken az oldalakon soha nem jelenik meg. */
const TILTOTT = ['fiokom', 'adatkezeles', 'ajandek']

function nemregBezarta(): boolean {
  // Fejlesztoi szerveren (teszteles) nincs egynapos szunet: minden
  // betolteskor ujra feljon. Az eles oldalon marad az egy nap.
  if (import.meta.env.DEV) return false
  try {
    const mikor = Number(localStorage.getItem(KULCS))
    return Number.isFinite(mikor) && Date.now() - mikor < SZUNET
  } catch {
    return false
  }
}

function bezartaMost() {
  try {
    localStorage.setItem(KULCS, String(Date.now()))
  } catch {
    // Tarolo nelkul legfeljebb kovetkezo betolteskor ujra feljon
  }
}

/**
 * Regisztracios popup kijelentkezett latogatonak, az uj rendszerben. Az
 * oldal betoltese utan kb. egy masodperccel jon fel, a hatterben latszik
 * az oldal. Ha bezarja, egy napig nem jon elo ujra. Ha nincs szabad
 * ajandek, nem jelenik meg.
 */
export default function AjandekPopup() {
  const fiok = useFiok()
  const [szabad, setSzabad] = useState(false)

  // A tarolot csak a bongeszoben olvassuk, a hidratalas utan
  useEffect(() => {
    const ut = window.location.pathname.replace(/^\/+|\/+$/g, '')
    if (!TILTOTT.includes(ut) && !nemregBezarta()) setSzabad(true)
  }, [])

  if (!szabad || fiok.allapot !== 'kint' || fiok.ablak) return null
  return <Ablak onBezar={() => setSzabad(false)} />
}

function Ablak({ onBezar }: { onBezar: () => void }) {
  const kinalat = useKinalat()
  const azon = useId()
  const [lathato, setLathato] = useState(false)

  // A valaszthato welcome ajanlatok, a kinalat RPC-bol
  const ajanlatok = (kinalat?.ajanlatok ?? []).filter((a) => a.tipus === 'welcome' && a.szabad > 0)

  useEffect(() => {
    const ido = window.setTimeout(() => setLathato(true), 1000)
    return () => window.clearTimeout(ido)
  }, [])

  const nyitva = lathato && ajanlatok.length > 0

  const mostNem = () => {
    bezartaMost()
    onBezar()
  }

  useEffect(() => {
    if (!nyitva) return
    const billentyu = (e: KeyboardEvent) => {
      if (e.key === 'Escape') mostNem()
    }
    window.addEventListener('keydown', billentyu)
    // iOS-on is biztos zar, lasd gorgetesZar.ts
    const feloldas = gorgetesZarolasa()
    return () => {
      window.removeEventListener('keydown', billentyu)
      feloldas()
    }
  }, [nyitva]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!nyitva) return null

  // A belepo lap tetejen a valasztott ajandek matricaja: sorra koppintva
  // annak a szazaleka, a nagy gombbal a legnagyobb
  const regisztral = (cimke: string) => {
    onBezar()
    belepesNyitasaAjandekkal(cimke)
  }
  // Ha minden ajanlatnal ugyanannyi a bevaltasi ido, kiirjuk
  const napok = new Set(ajanlatok.map((a) => a.ervenyes_nap))
  const nap = napok.size === 1 ? [...napok][0] : null

  // A legnagyobb welcome szazalek a cimbe
  const max = legnagyobbSzazalek(ajanlatok)

  // Osszevetes a sima (alap) kedvezmennyel ugyanezeknel a helyeknel. Ha
  // nincs mihez merni, vagy nem nagyobb, a sor elmarad.
  const alapok = ajanlatok
    .map((a) => szazalek(alapAjanlat(kinalat, a.partner_slug)))
    .filter((x): x is number => x !== null)
  const alapMin = alapok.length > 0 ? Math.min(...alapok) : null
  const alapMax = alapok.length > 0 ? Math.max(...alapok) : null
  const osszevetes =
    max !== null && alapMin !== null && alapMax !== null && max > alapMax
      ? `A sima kedvezmény ${alapMin === alapMax ? alapMin : `${alapMin}-${alapMax}`}%, ez akár ${max}%`
      : null

  return (
    <div
      className="fiok-retes fiok-retes-attetszo ap-retes"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${azon}-cim`}
      onClick={(e) => {
        if (e.target === e.currentTarget) mostNem()
      }}
    >
      <div className="fiok-lap mozi-oldal-panel ap-lap">
        <div className="tn-panel-belso mozi-panel fiok-lap-belso ap-belso">
          <span className="ap-fogo" aria-hidden="true" />
          <button type="button" className="fiok-zaro" onClick={mostNem} aria-label="Bezárás">
            <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>

          <p className="ap-cimke">Ingyenes · csak e-mail kell</p>
          {/* A Felirat sotet valtozatanak osztalyai, hogy a szazalek kulon szint kaphasson */}
          <h2 id={`${azon}-cim`} className="tn-panel-cim ap-cim">
            <span className="tn-felirat tn-felirat-kicsi tn-felirat-sotet mozi-fejlec">
              <span className="tn-felirat-elso">
                {max !== null ? (
                  <>
                    Akár <span className="ap-cim-szam">{max}%</span> kedvezmény ajándékba
                  </>
                ) : (
                  'Kedvezmény ajándékba'
                )}
              </span>
            </span>
          </h2>
          <p className="ap-szoveg">
            Regisztrálj, és válassz egy helyet. Egyszer használhatod{nap ? `, ${nap} napig` : ''}.
          </p>

          <ul className="ap-lista">
            {ajanlatok.map((a, i) => {
              const sz = szazalek(a)
              return (
                <li key={a.id} style={{ '--ap-sor': i } as React.CSSProperties}>
                  <AjandekKartya
                    ajanlat={a}
                    max={max}
                    onClick={() => regisztral(sz !== null ? `−${sz}% vár rád` : 'Ajándék vár rád')}
                  />
                </li>
              )
            })}
          </ul>

          {osszevetes ? <p className="ap-osszevetes">{osszevetes}</p> : null}

          <button
            type="button"
            className="tn-kapszula mozi-gomb ap-cta"
            onClick={() => regisztral(max !== null ? `Akár −${max}% vár rád` : 'Ajándék vár rád')}
          >
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Kérem az ajándékom</span>
            <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true">
              <path d="M5 12h13M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="fiok-masodlagos ap-also">
            <button type="button" className="fiok-szoveggomb" onClick={mostNem}>
              Most nem
            </button>
            <span className="ap-megjegyzes">Jelszó nem kell</span>
          </div>
        </div>
      </div>
    </div>
  )
}
