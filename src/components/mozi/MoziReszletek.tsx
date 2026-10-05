import Visszaszamlalo from './Visszaszamlalo'
import Kereso from './Kereso'
import Toplista from './Toplista'
import Felirat from '../Felirat'
import { InfoIcon } from '../Icons'
import { beallitas, kezdet, vege } from '../../mozi/beallitas'
import { MoziHiba } from '../../mozi/api'
import type { Szavazas } from '../../mozi/useSzavazas'
import type { Talalat } from '../../mozi/wikidata'

type Props = {
  szavazas: Szavazas
  /** Mutassuk-e a teljes, negy blokkos visszaszamlalot. */
  teljesOra?: boolean
}

/** Esemeny idopontja olvashatoan, vagy a "hamarosan" szoveg. */
function idopontSzoveg(ertek: string | null) {
  if (!ertek) return 'Időpont: hamarosan'
  const szoveg = new Intl.DateTimeFormat('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ertek))
  return `Időpont: ${szoveg}`
}

/**
 * A szavazas teljes tartalma: bevezeto, lepesek, kereso, toplista es
 * aprobetus. A /mozi oldal es a fooldali lenyilo blokk is ezt mutatja,
 * mindketto a partner kartyak krem panel stilusaban.
 */
export default function MoziReszletek({ szavazas, teljesOra = false }: Props) {
  const {
    faz,
    lezart,
    szavazatom,
    sorok,
    osszes,
    listaTolt,
    listaHiba,
    setListaHiba,
    uzenet,
    lejart,
    kuldSzavazat,
    szavazhato,
    sajatAListaban,
  } = szavazas

  return (
    <>
      {teljesOra && !lezart ? (
        <div className="mozi-ora-blokk">
          <p className="mozi-ora-felirat">
            {faz === 'elotte' ? 'A szavazás eddig nyílik' : 'Eddig szavazhatsz'}
          </p>
          <Visszaszamlalo cel={faz === 'elotte' ? kezdet : vege} onLejart={lejart} />
        </div>
      ) : null}

      <p className="tn-panel-szoveg mozi-bevezeto">{beallitas.intro}</p>

      {/* Ide ugrunk a Szavazok gombrol: a lepesek es a kereso igy egyszerre latszik */}
      <div id="mozi-instrukciok" className="tn-panel-blokk mozi-instrukciok">
        <Felirat szoveg="Így működik" kicsi valtozat="sotet" className="mozi-fejlec" />
        <ol className="tn-lepesek">
          {beallitas.steps.map((lepes, index) => (
            <li key={lepes} className="tn-lepes">
              <span className="tn-lepes-szam">{index + 1}</span>
              <span>{lepes}</span>
            </li>
          ))}
        </ol>
      </div>

      <p className="mozi-idopont">{idopontSzoveg(beallitas.eventDate)}</p>

      {!lezart ? (
        <div id="szavazas" className="tn-panel-blokk mozi-szavazas-blokk">
          <Felirat szoveg="Szavazás" kicsi valtozat="sotet" className="mozi-fejlec" />

          {uzenet ? <p className="mozi-siker">{uzenet}</p> : null}

          <Kereso
            tiltva={!szavazhato}
            tiltoSzoveg={
              faz === null
                ? 'Egy pillanat...'
                : faz === 'elotte'
                  ? 'A szavazás még nem indult el. A visszaszámlálás végén nyitunk.'
                  : szavazatom
                    ? `Erre szavaztál: ${szavazatom.cim}. Egy szavazat jut mindenkinek.`
                    : undefined
            }
            onSzavaz={async (talalat: Talalat) =>
              kuldSzavazat({
                wikidataId: talalat.id,
                cim: talalat.cim,
                ev: talalat.ev,
                rendezo: talalat.rendezo,
              })
            }
          />
        </div>
      ) : null}

      <div className="tn-panel-blokk">
        <Felirat
          szoveg={lezart ? 'Végeredmény' : 'Toplista'}
          kicsi
          valtozat="sotet"
          className="mozi-fejlec"
        />

        <Toplista
          sorok={sorok}
          osszes={osszes}
          sajatId={szavazatom?.wikidataId ?? null}
          lezart={lezart}
          szavazhato={szavazhato}
          tolt={listaTolt}
          hiba={listaHiba}
          onPluszEgy={(sor) =>
            void kuldSzavazat({
              wikidataId: sor.wikidata_id,
              cim: sor.title,
              ev: sor.year,
              rendezo: sor.director,
            }).catch((baj) =>
              setListaHiba(
                baj instanceof MoziHiba ? baj.message : 'A szavazat nem ment át. Próbáld újra.',
              ),
            )
          }
        />

        {szavazatom && !sajatAListaban ? (
          <p className="mozi-sajat-kiemelt">
            A te szavazatod: <strong>{szavazatom.cim}</strong>. Még nincs az első ötben.
          </p>
        ) : null}

        {lezart ? <p className="mozi-zaro">Hamarosan bejelentjük az időpontot!</p> : null}
      </div>

      <p className="tn-feltetel mozi-feltetel">
        <InfoIcon className="tn-panel-ikon" />
        <span>
          {beallitas.disclaimer} Filmadatok: Wikidata.
        </span>
      </p>
    </>
  )
}
