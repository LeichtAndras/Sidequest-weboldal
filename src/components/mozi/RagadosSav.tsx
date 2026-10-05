import Visszaszamlalo from './Visszaszamlalo'
import { kezdet, vege } from '../../mozi/beallitas'
import type { Szakasz } from '../../mozi/beallitas'

type Props = {
  latszik: boolean
  faz: Szakasz | null
  onSzavazok: () => void
}

/**
 * Ragados also sav telefonon. Akkor jon elo, amikor a banner mar kigorgott,
 * es a szavazas szakasz sem latszik. A gomb odagorget a szavazashoz.
 */
export default function RagadosSav({ latszik, faz, onSzavazok }: Props) {
  return (
    <div className={`mozi-ragados${latszik ? ' mozi-ragados-latszik' : ''}`} aria-hidden={!latszik}>
      <span className="mozi-ragados-szoveg">
        Szavazz a filmről
        <span className="mozi-ragados-pont" aria-hidden="true">
          ·
        </span>
        <Visszaszamlalo cel={faz === 'elotte' ? kezdet : vege} valtozat="rovid" />
      </span>

      <button type="button" className="tn-kapszula mozi-ragados-gomb" onClick={onSzavazok} tabIndex={latszik ? 0 : -1}>
        <span className="tn-gomb-felirat tn-gomb-felirat-sotet">Szavazok</span>
      </button>
    </div>
  )
}
