import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Partner } from '../../types'
import CouponCode from '../CouponCode'
import { budapestiNap } from '../../ajanlat/valasztas'
import { FiokHiba, aktivAjandek, belepesNyitasa, onlineKodKerese, useFiok } from '../../fiok/fiok'
import { hataridoNap, kijelentkezettFelirat, useAjanlatok } from '../../fiok/ajanlatok'

const DATUM = new Intl.DateTimeFormat('hu-HU', { timeZone: 'Europe/Budapest', month: 'long', day: 'numeric' })

/** "2026-11" alaku honap a budapesti naptar szerint. */
const honap = (ido: number) => budapestiNap(ido).slice(0, 7)

/**
 * Online partnereknel (Pixity, Rage Room) a kedvezmeny egy szemelyes kod,
 * amit foglalaskor kell beirni. Ha itt aktiv az udvozlo ajandeka, udvozlo
 * kodot kap; kulonben havonta egy normal kodot. Hogy melyik, azt a szerver
 * donti el, ez a blokk csak kiirja.
 */
export default function OnlineKodBlokk({ partner }: { partner: Partner }) {
  const fiok = useFiok()
  const ajanlatok = useAjanlatok()
  const [kerdes, setKerdes] = useState(false)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)

  const ajandek = aktivAjandek(fiok.ajandek, partner.slug)
  const udvozlo = ajandek?.pct ?? 0
  const sajat = (fiok.bevaltasok ?? []).filter((b) => b.partner_slug === partner.slug && b.code)
  const ervenyes = sajat.filter((b) => Date.parse(b.expires_at) > Date.now())
  const ehaviMegvan = sajat.some((b) => honap(Date.parse(b.created_at)) === honap(Date.now()))

  useEffect(() => {
    if (!kerdes) return
    const regi = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = regi
    }
  }, [kerdes])

  const kerd = async () => {
    setDolgozik(true)
    setHiba(null)
    try {
      await onlineKodKerese(partner.slug)
      setKerdes(false)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült kódot kérni. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null
  const betolt =
    fiok.allapot === 'bent' &&
    (fiok.email === null || (fiok.keresztnev !== null && (fiok.bevaltasok === null || fiok.ajandek === null)))

  let gomb: { felirat: string; katt: () => void } | null = null
  if (betolt) gomb = { felirat: 'Betöltés...', katt: () => {} }
  else if (!belepve)
    gomb = { felirat: kijelentkezettFelirat(ajanlatok, partner.slug, partner.discount), katt: belepesNyitasa }
  else if (ajandek) gomb = { felirat: `Üdvözlő kód kérése (${udvozlo}%)`, katt: () => setKerdes(true) }
  else if (!ehaviMegvan) gomb = { felirat: `Havi kód kérése (${partner.discount})`, katt: () => void kerd() }

  return (
    <div className="bev-blokk">
      {belepve && ervenyes.length > 0
        ? ervenyes.map((b) => (
            <div key={b.code} className="bev-kod-sor">
              <p className="bev-kod-cimke">
                {b.tipus === 'welcome' ? `Üdvözlő kódod (${b.pct}%)` : `Havi kódod (${b.pct}%)`}
                <span> · {DATUM.format(new Date(Date.parse(b.expires_at) - 1000)).replace(/\.$/, '')}-ig</span>
              </p>
              <CouponCode code={b.code!} />
            </div>
          ))
        : null}

      {gomb ? (
        <button type="button" className="tn-kapszula bev-gomb" onClick={gomb.katt} disabled={betolt || dolgozik}>
          <span className="tn-gomb-felirat tn-gomb-felirat-sotet bev-gomb-felirat">
            {dolgozik && !kerdes ? 'Pillanat...' : gomb.felirat}
          </span>
        </button>
      ) : belepve ? (
        <p className="mozi-jelzes">Ebben a hónapban már megkaptad a kódodat. Jövő hónapban kérhetsz újat.</p>
      ) : null}

      {belepve && ajandek?.lejarat ? (
        <p className="bev-hatarido">Az üdvözlő ajándékod {hataridoNap(ajandek.lejarat)}-ig kérhető.</p>
      ) : null}

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
              aria-label="Üdvözlő kód kérése"
              onClick={(e) => {
                if (e.target === e.currentTarget && !dolgozik) setKerdes(false)
              }}
            >
              <div className="fiok-lap mozi-oldal-panel">
                <div className="tn-panel-belso mozi-panel fiok-lap-belso">
                  <p className="bev-megerosites-cim">Az üdvözlő ajándék egyszer jár</p>
                  <p className="mozi-jelzes">
                    {`Most megkapod a ${udvozlo}%-os üdvözlő kódodat. Akkor kérd, ha foglalni akarsz: amint megkapod, az ajándékod felhasználtnak számít.`}
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
