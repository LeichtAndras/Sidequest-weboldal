import Felirat from '../Felirat'
import { dropAllapot, dropIndulas, kiemeltDrop, useKinalat, useSzerverIdo } from '../../fiok/kinalat'
import Visszaszamlalo from './Visszaszamlalo'

/**
 * A fooldalon a Mai Quest folott: a kovetkezo drop, ha van kozelgo vagy elo.
 * Visszaszamlalo vagy "Most élő · Még X db", es egy gomb a /drop/ oldalra.
 * Itt nincs ismetelt lekeres, csak az ora ketyeg; a darabszam a /drop/
 * oldalon frissul.
 */
export default function DropKartya() {
  const kinalat = useKinalat()
  const most = useSzerverIdo(kinalat?.eltolas ?? 0)
  const drop = kiemeltDrop(kinalat, most)
  if (!drop) return null

  const elo = dropAllapot(drop, most) === 'elo'

  return (
    <section className="ma-szekcio" aria-labelledby="drop-cim">
      <h2 id="drop-cim" className="ma-cim">
        <Felirat szoveg="Drop" />
      </h2>

      <div className="mozi-oldal-panel">
        <div className="tn-panel-belso mozi-panel">
          <p className="drop-kartya-partner">{drop.partner}</p>
          <p className="drop-ajanlat">
            {drop.jelveny ? <span className="drop-jelveny">{drop.jelveny}</span> : null}
            {drop.szoveg}
          </p>

          {elo ? (
            <p className="bev-keret">Most élő · Még {drop.szabad} db</p>
          ) : (
            <Visszaszamlalo cel={Date.parse(drop.drop_kezdes!)} most={most} felirat={`Indul: ${dropIndulas(drop)}`} />
          )}

          <a className="tn-kapszula mozi-gomb" href="/drop/">
            <span className="tn-gomb-felirat tn-gomb-felirat-sotet">{elo ? 'Igénylem' : 'Irány a drop'}</span>
          </a>
        </div>
      </div>
    </section>
  )
}
