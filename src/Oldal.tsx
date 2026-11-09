import App from './App'
import Mozi from './Mozi'
import Fiokom from './Fiokom'
import Adatkezeles from './Adatkezeles'
import Ajandek from './Ajandek'
import Drop from './Drop'
import { useUjRendszer } from './fiok/kapcsolo'
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
  const slug = slugFromPath(ut)
  if (slug === 'fiokom') return <Fiokom />
  if (slug === 'adatkezeles') return <Adatkezeles />
  // Az uj oldalak csak az uj rendszerben leteznek; kulonben a fooldal jon
  if (slug === 'ajandek') return <CsakUj><Ajandek /></CsakUj>
  if (slug === 'drop') return <CsakUj><Drop /></CsakUj>
  const mozi = beallitas.aktiv && slug === 'mozi'
  return mozi ? <Mozi /> : <App utvonal={utvonal} />
}

/**
 * Az uj rendszer oldalai (/ajandek/, /drop/). Ha az uj rendszer nincs
 * bekapcsolva, a sima fooldalt kapja a latogato: semmi uj nem latszik, es
 * nem megy Supabase keres. Ezek az oldalak nincsenek eloreneneleve, a
 * 404.html (fooldal) szolgalja ki oket.
 */
function CsakUj({ children }: { children: React.ReactNode }) {
  const uj = useUjRendszer()
  return uj ? <>{children}</> : <App />
}
