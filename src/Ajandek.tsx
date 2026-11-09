import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import Felirat from './components/Felirat'
import BelepesAblak from './components/fiok/BelepesAblak'
import { FiokHiba, ajandekValasztasa, belepesNyitasa, useFiok, valaszthat } from './fiok/fiok'
import { ajanlatokFrissitese, hataridoNap, useAjanlatok, type Ajanlat } from './fiok/ajanlatok'

/**
 * Az udvozlo ajandek valasztasa. Regisztracio utan ide jon a user, es a
 * Fiokom oldalrol is elerheto, amig nem valasztott. Egyszeru lista, kepek
 * nelkul. Hogy jar-e meg darab, azt a szerver donti el.
 */
export default function Ajandek() {
  const fiok = useFiok()
  const ajanlatok = useAjanlatok()
  const [kerdes, setKerdes] = useState<Ajanlat | null>(null)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

  // Friss darabszamok minden megnyitaskor
  useEffect(() => {
    void ajanlatokFrissitese()
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
      await ajandekValasztasa(a.id)
      setKerdes(null)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a választás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  const ajandek = fiok.ajandek
  const betolt =
    fiok.allapot === 'ismeretlen' ||
    (fiok.allapot === 'bent' && (fiok.email === null || (fiok.keresztnev !== null && ajandek === null)))
  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null

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

              {belepve && ajandek?.statusz === 'aktiv' ? (
                <>
                  <h2 className="tn-panel-cim">
                    <Felirat szoveg="Megvan az ajándékod!" kicsi valtozat="sotet" className="mozi-fejlec" />
                  </h2>
                  <ul className="fiok-lista">
                    <li>
                      <span className="fiok-lista-nev">{ajandek.partner}</span>
                      <span className="fiok-lista-adat">{ajandek.pct}%</span>
                    </li>
                  </ul>
                  <p className="mozi-jelzes ajandek-szoveg">
                    {ajandek.lejarat ? `${hataridoNap(ajandek.lejarat)}-ig váltsd be. ` : ''}
                    A hely kártyáján találod a beváltás gombját.
                  </p>
                  <a className="tn-kapszula mozi-gomb" href={`/${ajandek.partner_slug}/`}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Irány a kártyája</span>
                  </a>
                </>
              ) : null}

              {belepve && ajandek?.statusz === 'bevaltott' ? (
                <p className="mozi-jelzes">
                  Az üdvözlő ajándékodat már beváltottad ({ajandek.partner}, {ajandek.pct}%). A többi helyen a normál
                  kedvezmény jár.
                </p>
              ) : null}

              {belepve && valaszthat(ajandek) ? (
                <>
                  {ajandek?.statusz === 'lejart' ? (
                    <p className="mozi-jelzes ajandek-szoveg">
                      A korábbi ajándékod lejárt, mert 14 napon belül nem váltottad be. Válassz újat.
                    </p>
                  ) : null}
                  <p className="mozi-jelzes ajandek-szoveg">
                    Válassz egy helyet, ahol egy alkalommal nagyobb kedvezményt kapsz. Csak egyet választhatsz.
                  </p>

                  {ajanlatok === null ? <p className="mozi-jelzes">Betöltés...</p> : null}
                  {ajanlatok !== null && ajanlatok.length === 0 ? (
                    <p className="mozi-jelzes">Most nincs választható ajándék. Nézz vissza később.</p>
                  ) : null}

                  <ul className="ajandek-lista">
                    {(ajanlatok ?? []).map((a) => {
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
                            <span className="ajandek-pct">{a.pct}%</span>
                            <span className="ajandek-darab">{elfogyott ? 'Elfogyott' : `Még ${a.szabad} db`}</span>
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
                    {kerdes.partner} {kerdes.pct}%
                  </p>
                  <p className="mozi-jelzes">Csak egyet választhatsz. 14 napod lesz beváltani.</p>
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
