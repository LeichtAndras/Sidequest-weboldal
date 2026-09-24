import { useEffect, useRef, useState } from 'react'

export type UtPont = {
  /** Vizszintes hely szazalekban, 0 a bal szel, 100 a jobb. */
  x: number
  /** Fuggoleges hely keppontban, a sav tetejehez kepest. */
  y: number
  /** Megallo-e: ide kerul jelolo. */
  megallo?: boolean
}

type Props = {
  magassag: number
  pontok: UtPont[]
}

/** Ismetelheto alzaj, hogy a festek szele egyenetlen legyen, de mindig ugyanugy. */
function alzaj(ertek: number) {
  const x = Math.sin(ertek * 12.9898) * 43758.5453
  return (x - Math.floor(x)) * 2 - 1
}

/** Catmull-Rom minta: a gorbe atmegy minden megadott ponton. */
function kozteslLepes(p0: UtPont, p1: UtPont, p2: UtPont, p3: UtPont, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  const ertek = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
  return { x: ertek(p0.x, p1.x, p2.x, p3.x), y: ertek(p0.y, p1.y, p2.y, p3.y) }
}

/**
 * Az ut a megadott pontokon halad at. A pontokat a kartyak valodi
 * helyzetebol szamoljuk, igy szureskor, lenyitaskor es atmeretezeskor
 * is egyutt mozog a tartalommal.
 */
function utvonalRajz(pontok: UtPont[]) {
  if (pontok.length < 2) return ''

  const bovitett = [pontok[0], ...pontok, pontok[pontok.length - 1]]
  const minta: UtPont[] = []

  for (let i = 1; i < bovitett.length - 2; i++) {
    const tav = Math.max(Math.abs(bovitett[i + 1].y - bovitett[i].y), 1)
    const lepesek = Math.max(6, Math.round(tav / 9))
    for (let l = 0; l < lepesek; l++) {
      minta.push(
        kozteslLepes(bovitett[i - 1], bovitett[i], bovitett[i + 1], bovitett[i + 2], l / lepesek),
      )
    }
  }
  minta.push(pontok[pontok.length - 1])

  return minta
    .map((pont, index) => {
      const remeges = alzaj(pont.y) * 0.45
      return `${index === 0 ? 'M' : 'L'}${(pont.x + remeges).toFixed(2)} ${pont.y.toFixed(1)}`
    })
    .join('')
}

export default function Road({ magassag, pontok }: Props) {
  const kereteRef = useRef<HTMLDivElement>(null)
  const vonalRef = useRef<SVGPathElement>(null)
  const [hossz, setHossz] = useState(0)
  const [aranyos, setAranyos] = useState(0)

  const utvonal = utvonalRajz(pontok)
  const megallok = pontok.filter((pont) => pont.megallo)

  useEffect(() => {
    const vonal = vonalRef.current
    if (!vonal || !utvonal) return
    setHossz(vonal.getTotalLength())
  }, [utvonal])

  useEffect(() => {
    const csokkentett = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (csokkentett) {
      setAranyos(1)
      return
    }

    const szamol = () => {
      const keret = kereteRef.current
      if (!keret) return
      const doboz = keret.getBoundingClientRect()
      const also = window.innerHeight * 0.85
      // A nevezobol levonjuk a kepernyo egy reszet, kulonben a vegso szakasz
      // sosem rajzolodna ki, mert az oldal aljan is maradna hatralevo resz.
      const nevezo = Math.max(doboz.height - window.innerHeight * 0.55, 1)
      setAranyos(Math.min(Math.max((also - doboz.top) / nevezo, 0), 1))
    }

    szamol()
    window.addEventListener('scroll', szamol, { passive: true })
    window.addEventListener('resize', szamol)
    return () => {
      window.removeEventListener('scroll', szamol)
      window.removeEventListener('resize', szamol)
    }
  }, [magassag])

  if (!utvonal || magassag < 20) return null

  const takaras = hossz
    ? { strokeDasharray: hossz, strokeDashoffset: hossz * (1 - aranyos) }
    : { strokeDasharray: 1, strokeDashoffset: 1 }

  return (
    <div
      ref={kereteRef}
      className="pointer-events-none absolute inset-x-0 top-0"
      style={{ height: magassag }}
      aria-hidden="true"
    >
      <svg className="h-full w-full" viewBox={`0 0 100 ${magassag}`} preserveAspectRatio="none">
        <defs>
          {/* Gorgetesre ez a maszk nyilik ki, igy minden reteg egyszerre rajzolodik */}
          <mask id="ut-maszk">
            <path
              ref={vonalRef}
              d={utvonal}
              fill="none"
              stroke="#fff"
              strokeWidth="80"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              style={takaras}
            />
          </mask>
        </defs>

        <g mask="url(#ut-maszk)">
          <path d={utvonal} fill="none" stroke="#36B9F0" strokeWidth="62" strokeLinecap="round" opacity="0.1" vectorEffect="non-scaling-stroke" />
          <path d={utvonal} fill="none" stroke="#36B9F0" strokeWidth="50" strokeLinecap="round" opacity="0.2" vectorEffect="non-scaling-stroke" />
          <path d={utvonal} fill="none" stroke="#36B9F0" strokeWidth="44" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={utvonal} fill="none" stroke="#0A2E40" strokeWidth="36" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={utvonal} fill="none" stroke="#36B9F0" strokeWidth="30" strokeLinecap="round" strokeDasharray="1 9" opacity="0.14" vectorEffect="non-scaling-stroke" />
          <path d={utvonal} fill="none" stroke="#FFFCF3" strokeWidth="4" strokeDasharray="16 22" opacity="0.75" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>

      {megallok.map((pont, index) => (
        <span
          key={index}
          className="absolute block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cream bg-accent shadow-[0_0_14px_rgba(54,185,240,0.9)]"
          style={{ left: `${pont.x}%`, top: pont.y }}
        />
      ))}
    </div>
  )
}
