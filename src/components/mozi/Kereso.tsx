import { useEffect, useId, useRef, useState } from 'react'
import { WikidataHiba, keresFilmet, type Talalat } from '../../mozi/wikidata'
import { MoziHiba } from '../../mozi/api'
import { FilmIcon } from '../Icons'

type Props = {
  /** Kikapcsolva, amig nem nyitott a szavazas, vagy ha mar szavaztal. */
  tiltva: boolean
  /** Mi legyen a kereso helyen, ha a szavazas nem elerheto. */
  tiltoSzoveg?: string
  onSzavaz: (talalat: Talalat) => Promise<void>
}

const VARAKOZAS = 300

/** Film cime, eve es rendezoje egy sorban. */
function alcim(talalat: Talalat) {
  return [talalat.ev, talalat.rendezo].filter(Boolean).join(' · ')
}

/** Filmkereso 300 ms keslelteessel, legfeljebb 8 talalattal, a Wikidatarol. */
export default function Kereso({ tiltva, tiltoSzoveg, onSzavaz }: Props) {
  const [kifejezes, setKifejezes] = useState('')
  const [talalatok, setTalalatok] = useState<Talalat[]>([])
  const [valasztott, setValasztott] = useState<Talalat | null>(null)
  const [tolt, setTolt] = useState(false)
  const [kuld, setKuld] = useState(false)
  const [hiba, setHiba] = useState<string | null>(null)
  const utolsoKeres = useRef(0)
  const listaId = useId()

  useEffect(() => {
    const szoveg = kifejezes.trim()
    if (tiltva || valasztott || szoveg.length < 2) {
      setTalalatok([])
      setTolt(false)
      return
    }

    const megszakito = new AbortController()
    const sajat = ++utolsoKeres.current
    setTolt(true)

    const idozito = window.setTimeout(async () => {
      try {
        const eredmeny = await keresFilmet(szoveg, megszakito.signal)
        if (sajat !== utolsoKeres.current) return
        setTalalatok(eredmeny)
        setHiba(eredmeny.length === 0 ? 'Nincs találat erre a címre.' : null)
      } catch (baj) {
        if (baj instanceof DOMException && baj.name === 'AbortError') return
        if (sajat !== utolsoKeres.current) return
        setTalalatok([])
        setHiba(
          baj instanceof WikidataHiba ? baj.message : 'A keresés most nem megy. Próbáld újra.',
        )
      } finally {
        if (sajat === utolsoKeres.current) setTolt(false)
      }
    }, VARAKOZAS)

    return () => {
      window.clearTimeout(idozito)
      megszakito.abort()
    }
  }, [kifejezes, tiltva, valasztott])

  async function szavazz() {
    if (!valasztott || kuld) return
    setKuld(true)
    setHiba(null)
    try {
      await onSzavaz(valasztott)
    } catch (baj) {
      setHiba(baj instanceof MoziHiba ? baj.message : 'A szavazat nem ment át. Próbáld újra.')
    } finally {
      setKuld(false)
    }
  }

  if (tiltva && tiltoSzoveg) {
    return <p className="mozi-jelzes">{tiltoSzoveg}</p>
  }

  return (
    <div className="mozi-kereso">
      <label className="mozi-cimke" htmlFor={`${listaId}-mezo`}>
        Keress rá a filmre
      </label>

      <div className="mozi-mezo-sor">
        <input
          id={`${listaId}-mezo`}
          type="search"
          className="mozi-mezo"
          placeholder="Film címe"
          autoComplete="off"
          disabled={tiltva}
          value={valasztott ? `${valasztott.cim}${valasztott.ev ? ` (${valasztott.ev})` : ''}` : kifejezes}
          onChange={(esemeny) => {
            setValasztott(null)
            setHiba(null)
            setKifejezes(esemeny.target.value)
          }}
        />
        {valasztott ? (
          <button
            type="button"
            className="mozi-torlo"
            onClick={() => {
              setValasztott(null)
              setKifejezes('')
              setHiba(null)
            }}
          >
            Mégsem
          </button>
        ) : null}
      </div>

      {tolt ? <p className="mozi-jelzes">Keresés...</p> : null}

      {!valasztott && talalatok.length > 0 ? (
        <ul className="mozi-talalatok" id={listaId}>
          {talalatok.map((talalat) => (
            <li key={talalat.id}>
              <button
                type="button"
                className="mozi-talalat"
                onClick={() => {
                  setValasztott(talalat)
                  setTalalatok([])
                  setHiba(null)
                }}
              >
                <span className="mozi-jelkep" aria-hidden="true">
                  <FilmIcon className="mozi-jelkep-ikon" />
                </span>
                <span className="mozi-talalat-szoveg">
                  <span className="mozi-talalat-cim">{talalat.cim}</span>
                  {alcim(talalat) ? <span className="mozi-talalat-ev">{alcim(talalat)}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {hiba ? <p className="mozi-hiba">{hiba}</p> : null}

      <button
        type="button"
        className="tn-kapszula mozi-gomb"
        disabled={!valasztott || kuld || tiltva}
        onClick={szavazz}
      >
        <span className="tn-gomb-felirat tn-gomb-felirat-sotet">
          {kuld ? 'Küldés...' : 'Szavazok'}
        </span>
      </button>
    </div>
  )
}
