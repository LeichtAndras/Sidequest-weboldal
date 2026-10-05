import { FilmIcon } from '../Icons'
import { ROBBANAS } from '../../robbanas'
import type { ToplistaSor } from '../../mozi/api'

type Props = {
  sorok: ToplistaSor[]
  osszes: number
  /** A sajat szavazatom Wikidata azonositoja, ezt kiemeljuk. */
  sajatId: string | null
  /** Lezart szavazasnal az elso helyezett a gyoztes. */
  lezart: boolean
  /** Ha meg lehet szavazni, a sorokon ott a +1 gomb. */
  szavazhato: boolean
  onPluszEgy: (sor: ToplistaSor) => void
  tolt: boolean
  hiba: string | null
}

/** Top 5 lista: sotetkek mini kartyak, az elsot pink csillag jeloli. */
export default function Toplista({
  sorok,
  osszes,
  sajatId,
  lezart,
  szavazhato,
  onPluszEgy,
  tolt,
  hiba,
}: Props) {
  if (hiba) return <p className="mozi-hiba">{hiba}</p>
  if (tolt && sorok.length === 0) return <p className="mozi-jelzes">Toplista töltése...</p>
  if (sorok.length === 0) {
    return <p className="mozi-jelzes">Még nincs szavazat. Tiéd lehet az első!</p>
  }

  const legtobb = Math.max(...sorok.map((sor) => sor.szavazat), 1)

  return (
    <>
      <ol className="mozi-toplista">
        {sorok.map((sor, index) => {
          const sajat = sajatId === sor.wikidata_id
          const elso = index === 0
          const szazalek = osszes > 0 ? Math.round((sor.szavazat / osszes) * 100) : 0
          const alcim = [sor.year, sor.director].filter(Boolean).join(' · ')

          return (
            <li
              key={sor.wikidata_id}
              className={`mozi-sor${sajat ? ' mozi-sor-sajat' : ''}${elso ? ' mozi-sor-elso' : ''}`}
            >
              {elso ? (
                <span className="mozi-helyezes-csillag" aria-hidden="true">
                  <svg viewBox="0 0 140 100">
                    <path d={ROBBANAS} fill="#FF2D78" stroke="#0B1B3A" strokeWidth="5" strokeLinejoin="round" />
                  </svg>
                  <span>1</span>
                </span>
              ) : (
                <span className="mozi-helyezes" aria-hidden="true">
                  {index + 1}
                </span>
              )}

              <span className="mozi-jelkep" aria-hidden="true">
                <FilmIcon className="mozi-jelkep-ikon" />
              </span>

              <span className="mozi-sor-szoveg">
                <span className="mozi-sor-cim">
                  {sor.title}
                  {lezart && elso ? <span className="mozi-jelolo">Győztes</span> : null}
                  {sajat && !(lezart && elso) ? <span className="mozi-jelolo">A te szavazatod</span> : null}
                </span>

                {alcim ? <span className="mozi-sor-ev">{alcim}</span> : null}

                <span className="mozi-arany" aria-hidden="true">
                  <span className="mozi-arany-kitolt" style={{ width: `${(sor.szavazat / legtobb) * 100}%` }} />
                </span>

                <span className="mozi-sor-adat">
                  {sor.szavazat} szavazat
                  {osszes > 0 ? ` · ${szazalek}%` : ''}
                </span>
              </span>

              {szavazhato ? (
                <button
                  type="button"
                  className="mozi-plusz"
                  onClick={() => onPluszEgy(sor)}
                  aria-label={`Szavazok erre: ${sor.title}`}
                >
                  +1
                </button>
              ) : null}
            </li>
          )
        })}
      </ol>

      <p className="mozi-osszes">Eddig {osszes} szavazat érkezett.</p>
    </>
  )
}
