import type { Partner } from '../types'
import { ROBBANAS } from '../robbanas'
import { useUjRendszer } from '../fiok/kapcsolo'
import { alapAjanlat, useKinalat } from '../fiok/kinalat'

function Robbanas({ szoveg }: { szoveg: string }) {
  return (
    <div className="hk-kedvezmeny">
      <svg viewBox="0 0 140 100" aria-hidden="true">
        <path d={ROBBANAS} fill="#FF2D78" stroke="#0B1B3A" strokeWidth="3.4" strokeLinejoin="round" />
      </svg>
      <span className="hk-kedvezmeny-szoveg">
        <span className="hk-kedvezmeny-szam">{szoveg}</span>
        <span className="hk-kedvezmeny-felirat">Kedvezmény</span>
      </span>
    </div>
  )
}

/** "10%" -> "−10%" (a minusz jelzi a kedvezmenyt); mas szabad szoveg (pl. "2=1") marad. */
function matricaSzoveg(jelveny: string): string {
  const szam = jelveny.trim().match(/^(\d+)\s?%$/)
  return szam ? `−${szam[1]}%` : jelveny
}

/**
 * Az uj rendszerben: az alap ajanlat jelvenye matricaban, a popup
 * matricainak stilusaban (lekerekitett lap, sotetkek korvonal, kemeny
 * arnyek, enyhe dontes). Csak itt toltjuk a kinalatot. Amig nem toltott be,
 * a kartya mostani szama all benne, hogy ne villanjon.
 */
function UjJelveny({ partner }: { partner: Partner }) {
  const kinalat = useKinalat()
  const szoveg = kinalat ? alapAjanlat(kinalat, partner.slug)?.jelveny : partner.discount
  return szoveg ? (
    <span className="hk-matrica" aria-label={`${szoveg} kedvezmény`}>
      {matricaSzoveg(szoveg)}
    </span>
  ) : null
}

/**
 * A kartya jobb felso sarkaban a kedvezmeny. A regi rendszerben pink
 * robbanas a partner discount mezojevel (a latogato ezt latja). Az ujban
 * matrica az alap ajanlat jelvenyevel (pl. "−20%", "2=1"); ha az ures,
 * nincs matrica, mert a teljes szoveg a kartyan es a gombon latszik.
 */
export default function KedvezmenyJelveny({ partner }: { partner: Partner }) {
  const uj = useUjRendszer(partner)
  return uj ? <UjJelveny partner={partner} /> : <Robbanas szoveg={partner.discount} />
}
