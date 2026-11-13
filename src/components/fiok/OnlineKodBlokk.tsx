import { useEffect, useState } from 'react'
import { gorgetesZarolasa } from '../../fiok/gorgetesZar'
import { createPortal } from 'react-dom'
import type { Partner } from '../../types'
import CouponCode from '../CouponCode'
import { budapestiNap } from '../../ajanlat/valasztas'
import { FiokHiba, alapBevaltasa, belepesNyitasa, useFiok } from '../../fiok/fiok'
import { alapAjanlat, keretSzoveg, kijelentkezettFelirat, useKinalat } from '../../fiok/kinalat'

const DATUM = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', month: 'long', day: 'numeric' })

/**
 * Online partnereknel (Pixity, Rage Room) az alap kedvezmeny egy
 * szemelyes kod a kodbankbol, amit foglalaskor kell beirni. Ugyanaz a
 * keret es napi limit, mint a helyszinieknel; a kod kiadasa a beváltás.
 * Hogy jar-e kod, azt a szerver donti el, ez a blokk csak kiirja.
 */
export default function OnlineKodBlokk({ partner }: { partner: Partner }) {
  const fiok = useFiok()
  const kinalat = useKinalat()
  const [kerdes, setKerdes] = useState(false)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

  const alap = alapAjanlat(kinalat, partner.slug)
  const sajat = (fiok.igenylesek ?? []).filter((c) => c.partner_slug === partner.slug && c.kod)
  const ervenyes = sajat.filter((c) => Date.parse(c.lejarat) > Date.now())
  const maiDarab = sajat.filter((c) => c.tipus === 'alap' && budapestiNap(Date.parse(c.igenyelve)) === budapestiNap()).length

  useEffect(() => {
    if (!kerdes) return
    // iOS-on is biztos zar, lasd gorgetesZar.ts
    const feloldas = gorgetesZarolasa()
    return () => {
      feloldas()
    }
  }, [kerdes])

  if (kinalat && !alap && ervenyes.length === 0) return null

  const kerd = async () => {
    if (!alap) return
    setDolgozik(true)
    setHiba(null)
    try {
      await alapBevaltasa(alap.id)
      setKerdes(false)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült kódot kérni. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null
  const betolt =
    !kinalat || (fiok.allapot === 'bent' && (fiok.email === null || (fiok.keresztnev !== null && fiok.igenylesek === null)))
  const szoveg = alap?.szoveg ?? partner.discount
  const elfogyott = alap !== null && alap.szabad < 1
  const napiLimit = Boolean(alap?.napi_limit && maiDarab >= alap.napi_limit)

  let felirat = `Kódot kérek: ${szoveg}`
  let kattintas: () => void = () => {
    setHiba(null)
    setKerdes(true)
  }
  let tiltva = elfogyott || napiLimit
  if (betolt) {
    felirat = 'Betöltés...'
    tiltva = true
  } else if (!belepve) {
    felirat = kijelentkezettFelirat(kinalat, partner.slug, szoveg)
    kattintas = belepesNyitasa
    tiltva = false
  }

  return (
    <div className="bev-blokk">
      {belepve
        ? ervenyes.map((c) => (
            <div key={c.id} className="bev-kod-sor">
              <p className="bev-kod-cimke">
                {c.tipus === 'welcome' ? `Üdvözlő ajándék: ${c.szoveg}` : c.szoveg}
                <span> · {DATUM.format(new Date(Date.parse(c.lejarat) - 1000)).replace(/\.$/, '')}-ig</span>
              </p>
              <CouponCode code={c.kod!} />
              <p className="bev-egy-kod">1 kód / foglalás</p>
            </div>
          ))
        : null}

      {/* Alap ajanlat nelkul csak a meglevo (pl. welcome) kodok latszanak */}
      {alap || !kinalat ? (
        <button type="button" className="tn-kapszula bev-gomb" onClick={kattintas} disabled={tiltva || dolgozik}>
          <span className="tn-gomb-felirat tn-gomb-felirat-sotet bev-gomb-felirat">
            {dolgozik && !kerdes ? 'Pillanat...' : felirat}
          </span>
        </button>
      ) : null}

      {alap && kinalat ? (
        <p className={`bev-keret${elfogyott ? ' bev-keret-elfogyott' : ''}`}>{keretSzoveg(alap, kinalat)}</p>
      ) : null}
      {belepve && napiLimit ? <p className="bev-hatarido">Ma már kértél kódot. Holnap kérhetsz újat.</p> : null}

      {belepve && partner.bookingUrl ? (
        <a className="tn-kapszula tn-kapszula-panel bev-foglalas" href={partner.bookingUrl} target="_blank" rel="noopener noreferrer">
          <span className="tn-gomb-felirat tn-gomb-felirat-sotet" style={{ fontSize: '4.4cqw' }}>
            Foglalás az oldalukon
          </span>
        </a>
      ) : null}

      {hiba && !kerdes ? <p className="mozi-hiba">{hiba}</p> : null}

      {kerdes
        ? createPortal(
            <div
              className="fiok-retes"
              role="dialog"
              aria-modal="true"
              aria-label="Kód kérése"
              onClick={(e) => {
                if (e.target === e.currentTarget && !dolgozik) setKerdes(false)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso">
                  <p className="bev-megerosites-cim">1 kód / foglalás</p>
                  <p className="mozi-jelzes">
                    {`${partner.name}: ${szoveg}. Akkor kérd, ha foglalni akarsz: amint megkapod, felhasználtnak számít. A kódot foglaláskor írd be.`}
                  </p>
                  {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={() => void kerd()} disabled={dolgozik}>
                    <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{dolgozik ? 'Pillanat...' : 'Kérem a kódot'}</span>
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
    </div>
  )
}
