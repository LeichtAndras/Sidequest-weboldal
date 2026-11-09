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

/** Az uj rendszerben: az alap ajanlat jelvenye. Csak itt toltjuk a kinalatot. */
function UjJelveny({ partner }: { partner: Partner }) {
  const kinalat = useKinalat()
  // Amig nem toltott be, a regi szam marad, hogy ne villanjon
  const szoveg = kinalat ? alapAjanlat(kinalat, partner.slug)?.jelveny : partner.discount
  return szoveg ? <Robbanas szoveg={szoveg} /> : null
}

/**
 * A kartya jobb felso sarkaban a kedvezmeny robbanas. A regi rendszerben
 * a partner discount mezoje all benne. Az ujban az alap ajanlat jelvenye
 * (pl. "−20%", "2=1"); ha az ures, nincs robbanas, mert a teljes szoveg a
 * kartyan es a gombon latszik.
 */
export default function KedvezmenyJelveny({ partner }: { partner: Partner }) {
  const uj = useUjRendszer(partner)
  return uj ? <UjJelveny partner={partner} /> : <Robbanas szoveg={partner.discount} />
}
