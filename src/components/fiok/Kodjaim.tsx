import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import partnersData from '../../data/partners.json'
import type { Partner } from '../../types'
import Felirat from '../Felirat'
import CouponCode from '../CouponCode'
import {
  FiokHiba,
  alapBevaltasa,
  igenylesBevaltasa,
  useFiok,
  type AktivBevaltas,
  type Igenyles,
} from '../../fiok/fiok'
import { hataridoNap, useKinalat } from '../../fiok/kinalat'
import BevaltasKepernyo from './BevaltasKepernyo'

const partnerek = new Map((partnersData as Partner[]).map((p) => [p.slug, p]))

const IDOPONT = new Intl.DateTimeFormat('hu-HU', {
  timeZone: 'Europe/Budapest',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const TIPUS: Record<Igenyles['tipus'], string> = { alap: 'Kedvezmény', welcome: 'Üdvözlő ajándék', drop: 'Drop' }

/** A helyszini kepernyo 5 percig el a beváltás utan. */
const kepernyoEl = (c: Igenyles) => c.bevaltva !== null && !c.kod && Date.parse(c.bevaltva) + 5 * 60 * 1000 > Date.now()

/**
 * Aktiv:     meg bevalthato (welcome, drop a pultnal), ervenyes online kod,
 *            vagy az 5 percen belul ujranyithato kepernyo
 * Beváltott: a beváltás idejevel
 * Lejárt:    be nem valtott, lejart
 */
function csoport(c: Igenyles): 'aktiv' | 'bevaltott' | 'lejart' {
  const most = Date.now()
  if (c.kod) return Date.parse(c.lejarat) > most ? 'aktiv' : 'bevaltott'
  if (c.bevaltva) return kepernyoEl(c) ? 'aktiv' : 'bevaltott'
  return Date.parse(c.lejarat) > most ? 'aktiv' : 'lejart'
}

/**
 * Kódjaim a Fiókom oldalon: minden igenyles (alap, welcome, drop) harom
 * csoportban. Az aktiv, helyszini kodnal "Beváltom": megerosites, utana
 * ugyanaz a teljes kepernyo, mint a kartyan. Online kodnal a kod maga.
 */
export default function Kodjaim() {
  const fiok = useFiok()
  const kinalat = useKinalat()
  const [kerdes, setKerdes] = useState<Igenyles | null>(null)
  const [aktiv, setAktiv] = useState<AktivBevaltas | null>(null)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

  useEffect(() => {
    if (!kerdes) return
    const regi = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = regi
    }
  }, [kerdes])

  const nev = (slug: string) =>
    partnerek.get(slug)?.name ?? kinalat?.ajanlatok.find((a) => a.partner_slug === slug)?.partner ?? slug

  const bevalt = async (c: Igenyles) => {
    setDolgozik(true)
    setHiba(null)
    try {
      // Az alap kepernyo ujranyitasa az ajanlattal megy, a tobbi az igenylessel
      const k = c.tipus === 'alap' ? (await alapBevaltasa(c.offer_id)).kepernyo : await igenylesBevaltasa(c.id)
      setKerdes(null)
      setAktiv(k)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a beváltás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  if (fiok.igenylesek === null) return <p className="mozi-jelzes">Betöltés...</p>

  const sorok = { aktiv: [] as Igenyles[], bevaltott: [] as Igenyles[], lejart: [] as Igenyles[] }
  for (const c of fiok.igenylesek) sorok[csoport(c)].push(c)

  const cim = (c: Igenyles) => (
    <p className="bev-kod-cimke">
      <strong>{nev(c.partner_slug)}</strong> · {TIPUS[c.tipus]}: {c.szoveg}
    </p>
  )

  return (
    <div className="tn-panel-blokk">
      <h2 className="tn-panel-cim">
        <Felirat szoveg="Kódjaim" kicsi valtozat="sotet" className="mozi-fejlec" />
      </h2>

      {fiok.igenylesek.length === 0 ? (
        <p className="mozi-jelzes">Még nincs kódod. A helyek kártyáján váltsd be a kedvezményt, vagy nézd meg a dropot.</p>
      ) : null}

      {sorok.aktiv.length > 0 ? <h3 className="adat-alcim">Aktív</h3> : null}
      {sorok.aktiv.map((c) => (
        <div key={c.id} className="bev-kod-sor kodjaim-sor">
          {cim(c)}
          {c.kod ? (
            <>
              <CouponCode code={c.kod} />
              <p className="bev-hatarido">
                Foglaláskor írd be, {hataridoNap(c.lejarat)}-ig érvényes. 1 kód / foglalás.
              </p>
              {partnerek.get(c.partner_slug)?.bookingUrl ? (
                <a
                  className="tn-kapszula tn-kapszula-panel bev-foglalas"
                  href={partnerek.get(c.partner_slug)!.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="tn-gomb-felirat tn-gomb-felirat-sotet" style={{ fontSize: '0.9rem' }}>
                    Foglalás az oldalukon
                  </span>
                </a>
              ) : null}
            </>
          ) : (
            <>
              <p className="bev-hatarido">
                {kepernyoEl(c) ? 'Beváltás folyamatban.' : `${hataridoNap(c.lejarat)}-ig váltható be a pultnál.`}
              </p>
              <button
                type="button"
                className="tn-kapszula bev-gomb"
                onClick={kepernyoEl(c) ? () => void bevalt(c) : () => setKerdes(c)}
                disabled={dolgozik}
              >
                <span className="tn-gomb-felirat tn-gomb-felirat-sotet bev-gomb-felirat">
                  {kepernyoEl(c) ? 'Aktív beváltás megnyitása' : 'Beváltom'}
                </span>
              </button>
            </>
          )}
        </div>
      ))}

      {sorok.bevaltott.length > 0 ? <h3 className="adat-alcim">Beváltott</h3> : null}
      {sorok.bevaltott.length > 0 ? (
        <ul className="fiok-lista">
          {sorok.bevaltott.map((c) => (
            <li key={c.id}>
              <span className="fiok-lista-nev">
                {nev(c.partner_slug)}
                <span className="kodjaim-reszlet">
                  {TIPUS[c.tipus]}: {c.szoveg}
                </span>
              </span>
              <span className="fiok-lista-adat">{IDOPONT.format(new Date(c.bevaltva ?? c.igenyelve))}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {sorok.lejart.length > 0 ? <h3 className="adat-alcim">Lejárt</h3> : null}
      {sorok.lejart.length > 0 ? (
        <ul className="fiok-lista kodjaim-lejart">
          {sorok.lejart.map((c) => (
            <li key={c.id}>
              <span className="fiok-lista-nev">
                {nev(c.partner_slug)}
                <span className="kodjaim-reszlet">
                  {TIPUS[c.tipus]}: {c.szoveg}
                </span>
              </span>
              <span className="fiok-lista-adat">lejárt {hataridoNap(c.lejarat)}</span>
            </li>
          ))}
        </ul>
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
                if (e.target === e.currentTarget && !dolgozik) setKerdes(null)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso">
                  <p className="bev-megerosites-cim">Csak a pultnál nyomd meg!</p>
                  <p className="mozi-jelzes">
                    {`${TIPUS[kerdes.tipus]}, ${nev(kerdes.partner_slug)}: ${kerdes.szoveg}. Egyszer használható: amint megnyomod, beváltottnak számít, és 5 percig látszik a képernyőn. Mutasd meg a pultnál. 1 kód / foglalás.`}
                  </p>
                  {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={() => void bevalt(kerdes)} disabled={dolgozik}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">
                      {dolgozik ? 'Pillanat...' : 'A pultnál vagyok, mutasd'}
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
