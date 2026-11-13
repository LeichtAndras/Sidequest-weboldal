import { useEffect, useState } from 'react'
import { gorgetesZarolasa } from '../../fiok/gorgetesZar'
import { createPortal } from 'react-dom'
import { ROBBANAS } from '../../robbanas'
import type { AktivBevaltas } from '../../fiok/fiok'

const ORA_FORMA = new Intl.DateTimeFormat('hu-HU', {
  timeZone: 'Europe/Budapest',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const ket = (n: number) => String(n).padStart(2, '0')

type Props = {
  bevaltas: AktivBevaltas
  onBezar: () => void
}

/**
 * A kasszanal felmutatott kepernyo. Egy kepernyokep ellen ket dolog ved:
 * az ora masodpercre pontosan jar, es a robbanas meg a csik folyamatosan
 * mozog. Egy kepen mindketto megall, elo kepernyon latszik, hogy mozog.
 *
 * Az orat a szerver idejehez igazitjuk, igy akkor is pontos, ha a telefon
 * oraja el van allitva. 5 perc utan "Lejárt" allapotba valt.
 */
export default function BevaltasKepernyo({ bevaltas, onBezar }: Props) {
  const [most, setMost] = useState(() => Date.now() + bevaltas.eltolas)

  useEffect(() => {
    const ido = window.setInterval(() => setMost(Date.now() + bevaltas.eltolas), 250)
    return () => window.clearInterval(ido)
  }, [bevaltas.eltolas])

  // Amig nyitva van, a kepernyo ne aludjon el a pénztár elott
  useEffect(() => {
    let zar: { release: () => Promise<void> } | null = null
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    nav.wakeLock?.request('screen').then((z) => (zar = z)).catch(() => {})
    return () => {
      void zar?.release().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const billentyu = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBezar()
    }
    window.addEventListener('keydown', billentyu)
    // iOS-on is biztos zar, lasd gorgetesZar.ts
    const feloldas = gorgetesZarolasa()
    return () => {
      window.removeEventListener('keydown', billentyu)
      feloldas()
    }
  }, [onBezar])

  const maradek = Math.max(0, bevaltas.lejarat - most)
  const lejart = maradek <= 0
  const mp = Math.ceil(maradek / 1000)

  return createPortal(
    <div className={`bev-kepernyo${lejart ? ' bev-lejart' : ''}`} role="dialog" aria-modal="true" aria-label="Kedvezmény beváltása">
      <div className="bev-lap tn-panel-belso mozi-panel">
        <button type="button" className="fiok-zaro" onClick={onBezar} aria-label="Bezárás">
          <svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </button>

        <p className="bev-cimke">{bevaltas.tipus === 'welcome' ? 'Üdvözlő ajándék' : bevaltas.tipus === 'drop' ? 'Drop' : 'SideQuest kedvezmény'}</p>
        <h2 className="bev-partner">{bevaltas.partner}</h2>

        {/* A forgo robbanas a jelvennyel; ha nincs jelveny, a csik es az ora ved */}
        {bevaltas.jelveny ? (
          <div className="bev-szazalek">
            <svg className="bev-robbanas" viewBox="0 0 140 100" aria-hidden="true">
              <path d={ROBBANAS} fill="#FF2D78" stroke="#0B1B3A" strokeWidth="3.4" strokeLinejoin="round" />
            </svg>
            <span
              className="bev-szazalek-szam"
              // A hosszabb jelveny (pl. "−5000") kisebb betuvel fer a robbanasba
              style={bevaltas.jelveny.length > 4 ? { fontSize: bevaltas.jelveny.length > 6 ? '2.1rem' : '2.9rem' } : undefined}
            >
              {bevaltas.jelveny}
            </span>
          </div>
        ) : null}

        <p className="bev-ajanlat">{bevaltas.szoveg}</p>

        <p className="bev-nev">{bevaltas.keresztnev}</p>

        <p className="bev-ora" role="timer" aria-live="off">
          {ORA_FORMA.format(most)}
        </p>

        <div className="bev-sav" aria-hidden="true">
          <span />
        </div>

        {lejart ? (
          <p className="bev-allapot bev-allapot-lejart">Lejárt</p>
        ) : (
          <p className="bev-allapot">
            Még {Math.floor(mp / 60)}:{ket(mp % 60)} érvényes
          </p>
        )}

        <p className="bev-kod">
          Azonosító: <strong>{bevaltas.rovidKod}</strong>
        </p>

        <p className="bev-egy-kod">1 kód / foglalás</p>

        <p className="mozi-jelzes bev-tipp">
          {!lejart
            ? 'Mutasd meg a pultnál. Az óra és a mozgó jel mutatja, hogy élő a képernyő.'
            : 'Ez a beváltás lejárt, és fel van használva.'}
        </p>
      </div>
    </div>,
    document.body,
  )
}
