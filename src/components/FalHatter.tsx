import { useEffect, useRef, useState } from 'react'
import falakAdat from '../data/walls.json'
import type { Fal } from '../types'

/** A kepek a public/images/walls mappaban, ket meretben. */
export const falak = (falakAdat as Fal[]).filter((fal) => fal.fajl?.trim())

/** "wall-3" es "wall-3.webp" is jo, a kiterjesztes lekerul. */
const alapNev = (fajl: string) => fajl.trim().replace(/\.(webp|jpe?g|png)$/i, '')

const utvonal = (fal: Fal, szeles: number) => `/images/walls/${alapNev(fal.fajl)}-${szeles}.webp`

type Props = { aktiv: number }

/**
 * Grafiti fal a tartalom mogott. A tartalom melyik falnal jar, azt az App
 * mondja meg. Egyszerre csak harom kep van a lapon: az elozo, amig kiuszik,
 * az aktualis, es a kovetkezo, ami igy elore betolt.
 */
export default function FalHatter({ aktiv }: Props) {
  const [elozo, setElozo] = useState<number | null>(null)
  const utolso = useRef(aktiv)

  useEffect(() => {
    if (utolso.current === aktiv) return

    setElozo(utolso.current)
    utolso.current = aktiv

    // A kiuszo kep az attunes utan lekerul, hogy ne maradjon felesleges reteg.
    const idozito = window.setTimeout(() => setElozo(null), 700)
    return () => window.clearTimeout(idozito)
  }, [aktiv])

  if (falak.length === 0) return <div className="fal-reteg" aria-hidden="true" />

  const jelenlegi = ((aktiv % falak.length) + falak.length) % falak.length
  const kovetkezo = (jelenlegi + 1) % falak.length
  const reteget = [...new Set([elozo ?? jelenlegi, jelenlegi, kovetkezo])]

  const fal = falak[jelenlegi]
  const felirat = [fal.helyszin?.trim(), fal.alkoto?.trim()].filter(Boolean).join(' · ')

  return (
    <div className="fal-reteg" aria-hidden="true">
      {reteget.map((sorszam) => (
        <img
          key={sorszam}
          src={utvonal(falak[sorszam], 900)}
          srcSet={`${utvonal(falak[sorszam], 900)} 900w, ${utvonal(falak[sorszam], 1600)} 1600w`}
          sizes="100vw"
          alt=""
          decoding="async"
          fetchPriority={sorszam === jelenlegi ? 'high' : 'low'}
          className={`fal-kep ${sorszam === jelenlegi ? 'fal-kep-aktiv' : ''}`}
        />
      ))}

      <div className="fal-sotetito" />

      {felirat ? <p className="fal-felirat">{felirat}</p> : null}
    </div>
  )
}
