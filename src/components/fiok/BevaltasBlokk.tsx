import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Partner } from '../../types'
import { FiokHiba, belepesNyitasa, bevaltasInditasa, useFiok, type AktivBevaltas } from '../../fiok/fiok'
import BevaltasKepernyo from './BevaltasKepernyo'

type Tipus = 'welcome' | 'normal'

/**
 * A kedvezmeny gombja a kartya lenyilo reszen, helyszini partnereknel.
 *
 *   kijelentkezve: "Regisztrálj, és az első alkalommal X% kedvezményt kapsz"
 *   belepve, udvozlo meg nincs: "Üdvözlő kedvezmény beváltása (X%)"
 *   belepve, udvozlo mar megvan: a normal kedvezmeny gombja
 *   5 percen belul ujranyithato az aktiv beváltás
 *
 * A gomb csak kenyelmi: hogy mi valthato be, azt a szerver donti el.
 */
export default function BevaltasBlokk({ partner }: { partner: Partner }) {
  const fiok = useFiok()
  const [kerdes, setKerdes] = useState<Tipus | null>(null)
  const [aktiv, setAktiv] = useState<AktivBevaltas | null>(null)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)
  const [, setUtem] = useState(0)

  const udvozlo = partner.welcomeDiscount ?? 0
  const sajat = fiok.bevaltasok?.filter((b) => b.partner_slug === partner.slug) ?? []
  const udvozloKesz = sajat.some((b) => b.tipus === 'welcome')
  const aktivSor = sajat.find((b) => Date.parse(b.expires_at) > Date.now())

  // Amig van aktiv beváltás, figyeljuk a lejaratat, hogy a gomb idoben visszavaltson
  useEffect(() => {
    if (!aktivSor) return
    const ido = window.setInterval(() => setUtem((n) => n + 1), 5000)
    return () => window.clearInterval(ido)
  }, [aktivSor])

  // A megerosito ablak alatt ne goroghessen a lap
  useEffect(() => {
    if (!kerdes) return
    const regi = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = regi
    }
  }, [kerdes])

  const indit = async (tipus: Tipus) => {
    setDolgozik(true)
    setHiba(null)
    try {
      const b = await bevaltasInditasa(partner.slug, tipus)
      setKerdes(null)
      setAktiv(b)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a beváltás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  // Ujranyitas: csak ha tenyleg ervenyes meg, kulonben a rendes, megerositos ut jon
  const ujranyit = () => {
    if (aktivSor && Date.parse(aktivSor.expires_at) > Date.now()) void indit(aktivSor.tipus)
    else setKerdes(udvozloKesz ? 'normal' : 'welcome')
  }

  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null
  const betolt = fiok.allapot === 'bent' && (fiok.email === null || (fiok.keresztnev !== null && fiok.bevaltasok === null))

  let felirat: string
  let kattintas: () => void
  if (betolt) {
    felirat = 'Betöltés...'
    kattintas = () => {}
  } else if (!belepve) {
    felirat = `Regisztrálj, és az első alkalommal ${udvozlo}% kedvezményt kapsz`
    kattintas = belepesNyitasa
  } else if (aktivSor) {
    felirat = 'Aktív beváltás megnyitása'
    kattintas = ujranyit
  } else if (!udvozloKesz) {
    felirat = `Üdvözlő kedvezmény beváltása (${udvozlo}%)`
    kattintas = () => {
      setHiba(null)
      setKerdes('welcome')
    }
  } else {
    felirat = `Kedvezmény beváltása (${partner.discount})`
    kattintas = () => {
      setHiba(null)
      setKerdes('normal')
    }
  }

  return (
    <div className="bev-blokk">
      <button type="button" className="tn-kapszula bev-gomb" onClick={kattintas} disabled={betolt || dolgozik}>
        <span className="tn-gomb-felirat tn-gomb-felirat-sotet bev-gomb-felirat">{felirat}</span>
      </button>

      {hiba && !kerdes ? <p className="mozi-hiba">{hiba}</p> : null}

      {kerdes
        ? createPortal(
            <div
              className="fiok-retes"
              role="dialog"
              aria-modal="true"
              aria-label="Beváltás megerősítése"
              onClick={(e) => {
                if (e.target === e.currentTarget && !dolgozik) setKerdes(null)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso">
                  <p className="bev-megerosites-cim">Csak a kasszánál nyomd meg!</p>
                  <p className="mozi-jelzes">
                    {kerdes === 'welcome'
                      ? `Az üdvözlő kedvezmény (${udvozlo}%) egyszer használható. Amint megnyomod, felhasználtnak számít, és 5 percig látszik a képernyőn.`
                      : `A kedvezmény (${partner.discount}) 5 percig látszik a képernyőn. Mutasd meg a pénztárosnak.`}
                  </p>
                  {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={() => void indit(kerdes)} disabled={dolgozik}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">
                      {dolgozik ? 'Pillanat...' : 'A kasszánál vagyok, mutasd'}
                    </span>
                  </button>
                  <div className="fiok-masodlagos">
                    <button type="button" className="fiok-szoveggomb" onClick={() => setKerdes(null)} disabled={dolgozik}>
                      Mégsem
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {aktiv ? <BevaltasKepernyo bevaltas={aktiv} onBezar={() => setAktiv(null)} /> : null}
    </div>
  )
}
