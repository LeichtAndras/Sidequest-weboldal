import App from './App'
import Mozi from './Mozi'
import { beallitas } from './mozi/beallitas'
import { slugFromPath } from './site'

type Props = {
  /** Csak elorenderelesnel adjuk at, a bongeszoben a cimsorbol jon. */
  utvonal?: string
}

/**
 * A cim alapjan valaszt oldalt. A /mozi sajat oldal, minden mas a fooldal.
 * Ha a vetites nincs bekapcsolva, a /mozi sem letezik: akkor sem keszul el
 * a statikus oldala, igy a 404.html jon be, az pedig a fooldalt mutatja.
 */
export default function Oldal({ utvonal }: Props) {
  const ut = utvonal ?? (typeof window === 'undefined' ? '/' : window.location.pathname)
  const mozi = beallitas.aktiv && slugFromPath(ut) === 'mozi'
  return mozi ? <Mozi /> : <App utvonal={utvonal} />
}
