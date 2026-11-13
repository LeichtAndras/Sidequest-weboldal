import { useEffect, useState } from 'react'
import { gorgetesZarolasa } from '../../fiok/gorgetesZar'
import { createPortal } from 'react-dom'
import type { Partner } from '../../types'
import {
  FiokHiba,
  aktivWelcome,
  alapBevaltasa,
  belepesNyitasa,
  useFiok,
  igenylesBevaltasa,
  type AktivBevaltas,
} from '../../fiok/fiok'
import { budapestiNap } from '../../ajanlat/valasztas'
import { alapAjanlat, hataridoNap, keretSzoveg, kijelentkezettFelirat, useKinalat } from '../../fiok/kinalat'
import BevaltasKepernyo from './BevaltasKepernyo'

/** 1 = hetfo ... 7 = vasarnap, budapesti ido szerint. */
function maiNap(): number {
  const nap = new Date(`${budapestiNap()}T12:00:00Z`).getUTCDay()
  return nap === 0 ? 7 : nap
}

/**
 * Az alap kedvezmeny gombja a kartya lenyilo reszen, helyszini partnernel.
 * Az igenyles es a beváltás egy lepes: "Beváltom" -> megerosites ->
 * teljes kepernyo. Amint megnyomja, beváltottnak szamit, es levonodik a
 * keretbol.
 *
 *   kijelentkezve: a regisztraciot nyitja
 *   itt aktiv a welcome ajandeka: azt valtja be (ugyanaz a kepernyo)
 *   5 percen belul: az aktiv beváltás ujranyithato (nem von le ujra)
 *   ma mar bevaltotta (napi limit), ma nem ervenyes, elfogyott: tiltva
 *
 * A gomb csak kenyelmi: hogy mi valthato be, azt a szerver donti el.
 */
export default function BevaltasBlokk({ partner }: { partner: Partner }) {
  const fiok = useFiok()
  const kinalat = useKinalat()
  const [kerdes, setKerdes] = useState<'alap' | 'welcome' | null>(null)
  const [aktiv, setAktiv] = useState<AktivBevaltas | null>(null)
  const [dolgozik, setDolgozik] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)
  const [, setUtem] = useState(0)

  const alap = alapAjanlat(kinalat, partner.slug)
  const sajat = (fiok.igenylesek ?? []).filter((c) => c.partner_slug === partner.slug && c.tipus === 'alap')
  const welcome = aktivWelcome(fiok.igenylesek, partner.slug)
  // Az 5 percen belul megnyitott kepernye ujranyithato: alapnal a kepernyo
  // lejaratig, welcome-nal a beváltás utan 5 percig
  const aktivSor =
    (alap ? sajat.find((c) => c.offer_id === alap.id && Date.parse(c.lejarat) > Date.now()) : undefined) ??
    (fiok.igenylesek ?? []).find(
      (c) =>
        c.tipus === 'welcome' &&
        c.partner_slug === partner.slug &&
        c.bevaltva !== null &&
        Date.parse(c.bevaltva) + 5 * 60 * 1000 > Date.now(),
    )
  const maiDarab = sajat.filter((c) => budapestiNap(Date.parse(c.igenyelve)) === budapestiNap()).length

  // Amig van aktiv beváltás, figyeljuk a lejaratat, hogy a gomb idoben visszavaltson
  useEffect(() => {
    if (!aktivSor) return
    const ido = window.setInterval(() => setUtem((n) => n + 1), 5000)
    return () => window.clearInterval(ido)
  }, [aktivSor])

  // A megerosito ablak alatt ne goroghessen a lap
  useEffect(() => {
    if (!kerdes) return
    // iOS-on is biztos zar, lasd gorgetesZar.ts
    const feloldas = gorgetesZarolasa()
    return () => {
      feloldas()
    }
  }, [kerdes])

  if (kinalat && !alap && !welcome && !aktivSor) return null

  const indit = async (mit: 'alap' | 'welcome', igenyles?: string) => {
    setDolgozik(true)
    setHiba(null)
    try {
      let kepernyo: AktivBevaltas | null = null
      if (mit === 'welcome' && igenyles) kepernyo = await igenylesBevaltasa(igenyles)
      else if (alap) kepernyo = (await alapBevaltasa(alap.id)).kepernyo
      setKerdes(null)
      setAktiv(kepernyo)
    } catch (h) {
      setHiba(h instanceof FiokHiba ? h.message : 'Nem sikerült a beváltás. Próbáld újra.')
    } finally {
      setDolgozik(false)
    }
  }

  const belepve = fiok.allapot === 'bent' && fiok.keresztnev !== null
  const betolt =
    !kinalat || (fiok.allapot === 'bent' && (fiok.email === null || (fiok.keresztnev !== null && fiok.igenylesek === null)))
  const szoveg = alap?.szoveg ?? partner.discount
  const elfogyott = alap !== null && alap.szabad < 1
  const maNem = Boolean(alap?.napok && !alap.napok.includes(maiNap()))
  const napiLimit = Boolean(alap?.napi_limit && maiDarab >= alap.napi_limit)

  let felirat: string
  let kattintas: () => void = () => {}
  let tiltva = false
  let megjegyzes: string | null = null
  if (betolt) {
    felirat = 'Betöltés...'
    tiltva = true
  } else if (!belepve) {
    felirat = kijelentkezettFelirat(kinalat, partner.slug, szoveg)
    kattintas = belepesNyitasa
  } else if (aktivSor) {
    felirat = 'Aktív beváltás megnyitása'
    kattintas = () => void indit(aktivSor.tipus === 'welcome' ? 'welcome' : 'alap', aktivSor.id)
  } else if (welcome) {
    felirat = `Üdvözlő ajándék beváltása: ${welcome.szoveg}`
    megjegyzes = `Az üdvözlő ajándékod ${hataridoNap(welcome.lejarat)}-ig váltható be.`
    kattintas = () => {
      setHiba(null)
      setKerdes('welcome')
    }
  } else if (napiLimit) {
    felirat = `Beváltom: ${szoveg}`
    tiltva = true
    megjegyzes = 'Ma már beváltottad itt. Holnap újra beválthatod.'
  } else if (maNem) {
    felirat = `Beváltom: ${szoveg}`
    tiltva = true
    megjegyzes = 'Ez a kedvezmény ma nem érvényes. Nézd meg a feltételeket.'
  } else {
    felirat = `Beváltom: ${szoveg}`
    tiltva = elfogyott
    kattintas = () => {
      setHiba(null)
      setKerdes('alap')
    }
  }

  return (
    <div className="bev-blokk">
      <button type="button" className="tn-kapszula bev-gomb" onClick={kattintas} disabled={tiltva || dolgozik}>
        <span className="tn-gomb-felirat tn-gomb-felirat-sotet bev-gomb-felirat">{felirat}</span>
      </button>

      {alap && kinalat && !welcome ? (
        <p className={`bev-keret${elfogyott ? ' bev-keret-elfogyott' : ''}`}>{keretSzoveg(alap, kinalat)}</p>
      ) : null}
      {megjegyzes ? <p className="bev-hatarido">{megjegyzes}</p> : null}
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
                    {kerdes === 'welcome' && welcome
                      ? `Üdvözlő ajándék, ${partner.name}: ${welcome.szoveg}. Egyszer használható: amint megnyomod, beváltottnak számít, és 5 percig látszik a képernyőn. Mutasd meg a pultnál. 1 kód / foglalás.`
                      : `${partner.name}: ${szoveg}. Amint megnyomod, beváltottnak számít, és 5 percig látszik a képernyőn. Mutasd meg a pultnál. 1 kód / foglalás.`}
                  </p>
                  {hiba ? <p className="mozi-hiba">{hiba}</p> : null}
                  <button type="button" className="tn-kapszula mozi-gomb" onClick={() => void indit(kerdes, welcome?.id)} disabled={dolgozik}>
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
