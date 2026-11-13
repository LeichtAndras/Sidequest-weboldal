import { useEffect, useState } from 'react'
import { gorgetesZarolasa } from '../../fiok/gorgetesZar'
import { createPortal } from 'react-dom'
import Felirat from '../Felirat'
import CouponCode from '../CouponCode'
import {
  FiokHiba,
  belepesNyitasa,
  dropIgenyles,
  igenylesBevaltasa,
  useFiok,
  type AktivBevaltas,
} from '../../fiok/fiok'
import { dropAllapot, dropIndulas, dropZaroSzoveg, hataridoNap, type Ajanlat } from '../../fiok/kinalat'
import BevaltasKepernyo from './BevaltasKepernyo'
import Visszaszamlalo from './Visszaszamlalo'

const BEVALTVA = new Intl.DateTimeFormat('hu-HU', {
  timeZone: 'Europe/Budapest',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Egy drop a /drop/ oldalon.
 *   kozelgo: visszaszamlalo az indulasig (a szerver idejehez igazitva)
 *   elo:     "Még X db" es "Igénylem"; kijelentkezve a belepest nyitja
 *   lezart:  "Elfogyott X perc alatt" vagy "Lezárult"
 * Ha mar igenyelte: a sajat kodja. Helyszini partnernel a pultnal kell
 * bevaltani (ugyanaz a kepernyo), online partnernel a kod a beváltás.
 * Hogy jar-e darab, a szerver donti el.
 */
export default function DropTetel({ ajanlat, most }: { ajanlat: Ajanlat; most: number }) {
  const fiok = useFiok()
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)
  const [kerdes, setKerdes] = useState(false)
  const [aktiv, setAktiv] = useState<AktivBevaltas | null>(null)

  useEffect(() => {
    if (!kerdes) return
    // iOS-on is biztos zar, lasd gorgetesZar.ts
    const feloldas = gorgetesZarolasa()
    return () => {
      feloldas()
    }
  }, [kerdes])

  const allapot = dropAllapot(ajanlat, most)
  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null
  const sajat = (fiok.igenylesek ?? []).find((c) => c.offer_id === ajanlat.id) ?? null
  const kepernyoEl = sajat?.bevaltva ? Date.parse(sajat.bevaltva) + 5 * 60 * 1000 > Date.now() : false

  const igenyel = async () => {
    setDolgozik(true)
    setHiba(null)
    try {
      await dropIgenyles(ajanlat.id)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült az igénylés. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  const bevalt = async () => {
    if (!sajat) return
    setDolgozik(true)
    setHiba(null)
    try {
      setAktiv(await igenylesBevaltasa(sajat.id))
      setKerdes(false)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a beváltás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  return (
    <section className={`tn-panel-blokk drop-tetel drop-${allapot}`}>
      <h2 className="tn-panel-cim">
        <Felirat szoveg={ajanlat.partner} kicsi valtozat="sotet" className="mozi-fejlec" />
      </h2>
      <p className="drop-ajanlat">
        {ajanlat.jelveny ? <span className="drop-jelveny">{ajanlat.jelveny}</span> : null}
        {ajanlat.szoveg}
      </p>

      {allapot === 'kozelgo' ? (
        <>
          <Visszaszamlalo cel={Date.parse(ajanlat.drop_kezdes!)} most={most} felirat={`Indul: ${dropIndulas(ajanlat)}`} />
          <p className="bev-keret">{ajanlat.keret} db lesz</p>
        </>
      ) : null}

      {allapot === 'elo' && !sajat ? (
        <>
          <p className="bev-keret">Még {ajanlat.szabad} db</p>
          <button
            type="button"
            className="tn-kapszula bev-gomb"
            onClick={belepve ? () => void igenyel() : belepesNyitasa}
            disabled={dolgozik || (fiok.allapot === 'bent' && !belepve)}
          >
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet bev-gomb-felirat">
              {dolgozik ? 'Pillanat...' : belepve ? 'Igénylem' : 'Lépj be az igényléshez'}
            </span>
          </button>
        </>
      ) : null}

      {allapot === 'lezart' && !sajat ? <p className="drop-zarva">{dropZaroSzoveg(ajanlat)}</p> : null}

      {sajat ? (
        <div className="drop-sajat">
          {sajat.kod ? (
            <>
              <p className="bev-kod-cimke">
                Megvan! Foglaláskor írd be, {hataridoNap(sajat.lejarat)}-ig érvényes.
              </p>
              <CouponCode code={sajat.kod} />
              <p className="bev-egy-kod">1 kód / foglalás</p>
            </>
          ) : sajat.bevaltva && !kepernyoEl ? (
            <p className="mozi-jelzes">Beváltva: {BEVALTVA.format(new Date(sajat.bevaltva))}</p>
          ) : Date.parse(sajat.lejarat) <= Date.now() && !sajat.bevaltva ? (
            <p className="mozi-jelzes">A kódod lejárt, nem váltottad be időben.</p>
          ) : (
            <>
              <p className="bev-kod-cimke">
                {kepernyoEl ? 'Beváltás folyamatban.' : `Megvan! ${hataridoNap(sajat.lejarat)}-ig váltsd be a pultnál.`}
              </p>
              <button
                type="button"
                className="tn-kapszula bev-gomb"
                onClick={kepernyoEl ? () => void bevalt() : () => setKerdes(true)}
                disabled={dolgozik}
              >
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet bev-gomb-felirat">
                  {kepernyoEl ? 'Aktív beváltás megnyitása' : 'Beváltom'}
                </span>
              </button>
              <p className="bev-egy-kod">1 kód / foglalás</p>
            </>
          )}
        </div>
      ) : null}

      {hiba && !kerdes ? <p className="mozi-hiba">{hiba}</p> : null}

      {kerdes
        ? createPortal(
            <div
              className="fiok-retes"
              role="dialog"
              aria-modal="true"
              aria-label="Beváltás megerősítése"
              onClick={(e) => {
                if (e.target === e.currentTarget && !dolgozik) setKerdes(false)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso">
                  <p className="bev-megerosites-cim">Csak a pultnál nyomd meg!</p>
                  <p className="mozi-jelzes">
                    {`Drop, ${ajanlat.partner}: ${ajanlat.szoveg}. Egyszer használható: amint megnyomod, beváltottnak számít, és 5 percig látszik a képernyőn. Mutasd meg a pultnál. 1 kód / foglalás.`}
                  </p>
                  {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={() => void bevalt()} disabled={dolgozik}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">
                      {dolgozik ? 'Pillanat...' : 'A pultnál vagyok, mutasd'}
                    </span>
                  </button>
                  <div className="fiok-masodlagos">
                    <button type="button" className="fiok-szoveggomb" onClick={() => setKerdes(false)} disabled={dolgozik}>
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
    </section>
  )
}
