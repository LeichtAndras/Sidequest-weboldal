import { useEffect, useId, useState } from 'react'
import Felirat from '../Felirat'
import { belepesNyitasa, useFiok } from '../../fiok/fiok'
import { legnagyobbSzazalek, useAjanlatok } from '../../fiok/ajanlatok'

const KULCS = 'sq-ajandek-popup'
const HET = 7 * 24 * 60 * 60 * 1000
/** Ezeken az oldalakon soha nem jelenik meg. */
const TILTOTT = ['fiokom', 'adatkezeles', 'ajandek']

function nemregBezarta(): boolean {
  try {
    const mikor = Number(localStorage.getItem(KULCS))
    return Number.isFinite(mikor) && Date.now() - mikor < HET
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
 * az oldal. Ha bezarja, 7 napig nem jon elo ujra. Ha nincs szabad
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
  const ajanlatok = useAjanlatok()
  const azon = useId()
  const [lathato, setLathato] = useState(false)

  const kinalat = (ajanlatok ?? []).filter((a) => a.szabad > 0)
  const max = legnagyobbSzazalek(ajanlatok)

  useEffect(() => {
    const ido = window.setTimeout(() => setLathato(true), 1000)
    return () => window.clearTimeout(ido)
  }, [])

  const nyitva = lathato && max !== null

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
    const regi = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', billentyu)
      document.body.style.overflow = regi
    }
  }, [nyitva]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!nyitva) return null

  return (
    <div
      className="fiok-retes fiok-retes-attetszo"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${azon}-cim`}
      onClick={(e) => {
        if (e.target === e.currentTarget) mostNem()
      }}
    >
      <div className="fiok-lap mozi-oldal-panel">
        <div className="tn-panel-belso mozi-panel fiok-lap-belso">
          <button type="button" className="fiok-zaro" onClick={mostNem} aria-label="Bezárás">
            <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </button>

          <h2 id={`${azon}-cim`} className="tn-panel-cim">
            <Felirat
              szoveg={`Regisztrálj, és egy alkalommal akár ${max}% kedvezményt kapsz`}
              kicsi
              valtozat="sotet"
              className="mozi-fejlec"
            />
          </h2>

          <ul className="fiok-lista">
            {kinalat.map((a) => (
              <li key={a.id}>
                <span className="fiok-lista-nev">{a.partner}</span>
                <span className="fiok-lista-adat">
                  {a.pct}% · még {a.szabad} db
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="tn-kapszula mozi-gomb"
            onClick={() => {
              onBezar()
              belepesNyitasa()
            }}
          >
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Regisztrálok</span>
          </button>
          <div className="fiok-masodlagos">
            <button type="button" className="fiok-szoveggomb" onClick={mostNem}>
              Most nem
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
