import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Felirat from './components/Felirat'
import CouponCode from './components/CouponCode'
import BelepesAblak from './components/fiok/BelepesAblak'
import { FiokHiba, belepesNyitasa, useFiok, valaszthat, welcomeAllapot, welcomeValasztasa } from './fiok/fiok'
import { hataridoNap, keretSzoveg, kinalatFrissitese, useKinalat, type Ajanlat } from './fiok/kinalat'

/**
 * A welcome ajandek valasztasa. Regisztracio utan ide jon a user, es a
 * Fiokom oldalrol is elerheto, amig nem valasztott. Egyszeru lista, kepek
 * nelkul: partner, ajanlat, darabszam. Hogy jar-e meg darab, azt a szerver
 * donti el.
 */
export default function Ajandek() {
  const fiok = useFiok()
  const kinalat = useKinalat()
  const [kerdes, setKerdes] = useState<Ajanlat | null>(null)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

  // Friss darabszamok minden megnyitaskor
  useEffect(() => {
    void kinalatFrissitese()
  }, [])

  useEffect(() => {
    if (!kerdes) return
    const regi = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = regi
    }
  }, [kerdes])

  const valaszt = async (a: Ajanlat) => {
    setDolgozik(true)
    setHiba(null)
    try {
      await welcomeValasztasa(a.id)
      setKerdes(null)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a választás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  const w = welcomeAllapot(fiok.igenylesek)
  const ajanlatok = (kinalat?.ajanlatok ?? []).filter((a) => a.tipus === 'welcome')
  const betolt =
    fiok.allapot === 'ismeretlen' ||
    (fiok.allapot === 'bent' && (fiok.email === null || (fiok.keresztnev !== null && w === null)))
  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null
  const sajat = w?.igenyles ?? null

  return (
    <div className="relative min-h-dvh">
      <div className="oldal-hatter" />

      <div className="tartalom-szakasz">
        <div className="tartalom-arnyek" />

        <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-10 pb-12 md:max-w-[640px]">
          <a href="/" className="mozi-vissza">
            Vissza a SideQuest oldalára
          </a>

          <h1 className="mozi-cim">Üdvözlő ajándék</h1>

          <div className="mozi-oldal-panel">
            <div className="tn-panel-belso mozi-panel">
              {betolt ? <p className="mozi-jelzes">Betöltés...</p> : null}

              {fiok.allapot === 'kint' ? (
                <>
                  <p className="mozi-jelzes">Lépj be, és válassz egy üdvözlő ajándékot.</p>
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={belepesNyitasa}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Belépés</span>
                  </button>
                </>
              ) : null}

              {fiok.allapot === 'bent' && fiok.keresztnev === null && fiok.email !== null ? (
                <>
                  <p className="mozi-jelzes">Még nem adtad meg a keresztneved. Ehhez kell az ajándék beváltásához.</p>
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={belepesNyitasa}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Kitöltöm</span>
                  </button>
                </>
              ) : null}

              {belepve && w?.statusz === 'aktiv' && sajat ? (
                <>
                  <h2 className="tn-panel-cim">
                    <Felirat szoveg="Megvan az ajándékod!" kicsi valtozat="sotet" className="mozi-fejlec" />
                  </h2>
                  <ul className="fiok-lista">
                    <li>
                      <span className="fiok-lista-nev">{partnerNev(kinalat?.ajanlatok ?? [], sajat.partner_slug) ?? sajat.partner_slug}</span>
                      <span className="fiok-lista-adat">{sajat.szoveg}</span>
                    </li>
                  </ul>
                  <p className="mozi-jelzes ajandek-szoveg">
                    {hataridoNap(sajat.lejarat)}-ig váltsd be. A hely kártyáján találod a beváltás gombját.
                  </p>
                  <a className="tn-kapszula mozi-gomb" href={`/${sajat.partner_slug}/`}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Irány a kártyája</span>
                  </a>
                </>
              ) : null}

              {belepve && w?.statusz === 'bevaltott' && sajat ? (
                sajat.kod && Date.parse(sajat.lejarat) > Date.now() ? (
                  <>
                    <h2 className="tn-panel-cim">
                      <Felirat szoveg="Megvan az ajándékod!" kicsi valtozat="sotet" className="mozi-fejlec" />
                    </h2>
                    <p className="mozi-jelzes ajandek-szoveg">
                      {partnerNev(kinalat?.ajanlatok ?? [], sajat.partner_slug) ?? sajat.partner_slug}: {sajat.szoveg}. Foglaláskor írd
                      be ezt a kódot, {hataridoNap(sajat.lejarat)}-ig érvényes.
                    </p>
                    <CouponCode code={sajat.kod} />
                    <p className="bev-egy-kod">1 kód / foglalás</p>
                  </>
                ) : (
                  <p className="mozi-jelzes">
                    Az üdvözlő ajándékodat már beváltottad ({sajat.szoveg}). A többi helyen az alap kedvezmény jár.
                  </p>
                )
              ) : null}

              {belepve && valaszthat(w) ? (
                <>
                  {w?.statusz === 'lejart' ? (
                    <p className="mozi-jelzes ajandek-szoveg">
                      A korábbi ajándékod lejárt, mert nem váltottad be időben. Válassz újat.
                    </p>
                  ) : null}
                  <p className="mozi-jelzes ajandek-szoveg">
                    Válassz egy helyet, ahol egy alkalommal nagyobb kedvezményt kapsz. Csak egyet választhatsz.
                  </p>

                  {kinalat === null ? <p className="mozi-jelzes">Betöltés...</p> : null}
                  {kinalat !== null && ajanlatok.length === 0 ? (
                    <p className="mozi-jelzes">Most nincs választható ajándék. Nézz vissza később.</p>
                  ) : null}

                  <ul className="ajandek-lista">
                    {ajanlatok.map((a) => {
                      const elfogyott = a.szabad < 1
                      return (
                        <li key={a.id}>
                          <button
                            type="button"
                            className="ajandek-sor"
                            disabled={elfogyott || dolgozik}
                            onClick={() => {
                              setHiba(null)
                              setKerdes(a)
                            }}
                          >
                            <span className="ajandek-nev">{a.partner}</span>
                            <span className="ajandek-pct">{a.jelveny ?? ''}</span>
                            <span className="ajandek-darab">
                              {a.szoveg} · {kinalat ? keretSzoveg(a, kinalat) : ''}
                            </span>
                          </button>
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

      {kerdes
        ? createPortal(
            <div
              className="fiok-retes"
              role="dialog"
              aria-modal="true"
              aria-label="Ajándék választása"
              onClick={(e) => {
                if (e.target === e.currentTarget && !dolgozik) setKerdes(null)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso">
                  <p className="bev-megerosites-cim">
                    {kerdes.partner}: {kerdes.szoveg}
                  </p>
                  <p className="mozi-jelzes">
                    {kerdes.mod === 'online_kod'
                      ? 'Csak egyet választhatsz. Rögtön megkapod a kódot, foglaláskor kell beírnod.'
                      : `Csak egyet választhatsz. ${kerdes.ervenyes_nap} napod lesz beváltani.`}
                  </p>
                  {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={() => void valaszt(kerdes)} disabled={dolgozik}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{dolgozik ? 'Pillanat...' : 'Ezt választom'}</span>
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

      <BelepesAblak />
    </div>
  )
}

/** A partner neve a kinalatbol (a claims sor csak a slugot tudja). */
function partnerNev(ajanlatok: Ajanlat[], slug: string): string | null {
  return ajanlatok.find((a) => a.partner_slug === slug)?.partner ?? null
}
