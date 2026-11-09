import { useEffect } from 'react'
import BelepesAblak from './components/fiok/BelepesAblak'
import DropTetel from './components/fiok/DropTetel'
import { dropAllapot, kinalatFrissitese, useKinalat, useSzerverIdo, type Ajanlat } from './fiok/kinalat'

const SORREND = { elo: 0, kozelgo: 1, lezart: 2 }

/**
 * A /drop/ oldal. Heti par drop fix idopontban, korlatozott darabszammal.
 * Az ora a szerver idejehez igazodik. A darabszamot 3 masodpercenkent
 * frissitjuk, de csak amig az oldal nyitva van, es van elo drop, vagy
 * egy percen belul indul egy. Kulonben nem megy keres.
 */
export default function Drop() {
  const kinalat = useKinalat()
  const most = useSzerverIdo(kinalat?.eltolas ?? 0)

  // Friss adat minden megnyitaskor
  useEffect(() => {
    void kinalatFrissitese()
  }, [])

  const dropok = (kinalat?.ajanlatok ?? [])
    .filter((a) => a.tipus === 'drop')
    .sort(
      (x, y) =>
        SORREND[dropAllapot(x, most)] - SORREND[dropAllapot(y, most)] ||
        Date.parse(x.drop_kezdes!) - Date.parse(y.drop_kezdes!),
    )

  const frissitesKell = dropok.some((a: Ajanlat) => {
    const allapot = dropAllapot(a, most)
    return allapot === 'elo' || (allapot === 'kozelgo' && Date.parse(a.drop_kezdes!) - most <= 60_000)
  })

  useEffect(() => {
    if (!frissitesKell) return
    const ido = window.setInterval(() => void kinalatFrissitese(), 3000)
    return () => window.clearInterval(ido)
  }, [frissitesKell])

  return (
    <div className="relative min-h-dvh">
      <div className="oldal-hatter" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-10 pb-12 md:max-w-[640px]">
          <a href="/" className="mozi-vissza">
            Vissza a SideQuest oldalára
          </a>

          <h1 className="mozi-cim">Drop</h1>

          <div className="mozi-oldal-panel">
            <div className="tn-panel-belso mozi-panel">
              <p className="mozi-jelzes">
                Hetente kétszer, fix időpontban limitált ajánlat. Aki gyors, viszi: fiókonként egy igényelhető, és
                7 napod van beváltani.
              </p>

              {kinalat === null ? <p className="mozi-jelzes">Betöltés...</p> : null}
              {kinalat !== null && dropok.length === 0 ? (
                <p className="mozi-jelzes">Most nincs meghirdetett drop. Nézz vissza később.</p>
              ) : null}

              {kinalat
                ? dropok.map((a) => <DropTetel key={a.id} ajanlat={a} most={most} />)
                : null}
            </div>
          </div>
        </div>
      </div>

      <BelepesAblak />
    </div>
  )
}
