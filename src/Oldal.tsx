import App from './App'
import Mozi from './Mozi'
import { slugFromPath } from './site'

type Props = {
  /** Csak elorenderelesnel adjuk at, a bongeszoben a cimsorbol jon. */
  utvonal?: string
}

/** A cim alapjan valaszt oldalt. A /mozi sajat oldal, minden mas a fooldal. */
export default function Oldal({ utvonal }: Props) {
  const ut = utvonal ?? (typeof window === 'undefined' ? '/' : window.location.pathname)
  return slugFromPath(ut) === 'mozi' ? <Mozi /> : <App utvonal={utvonal} />
}
