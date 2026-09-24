import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = { children: ReactNode; delay?: number; className?: string }

/** A kepernyo aljahoz kepest ennyinel feljebb indul a megjelenes. */
const KUSZOB = 0.92
/** Vegso biztositek: ennyi ido utan minden kartya megjelenik magatol. */
const BIZTOSITEK = 3000

/**
 * Kozos figyelo az osszes kartyahoz. Egy gorgetes esemeny egyszer fut le,
 * nem kartyankent. A vegso biztositek miatt a kartyak akkor sem maradhatnak
 * lathatatlanok, ha a bongeszo nem kuld gorgetes esemenyt, peldaul egy
 * alkalmazason beluli webview-ban vagy hatterben levo fulon.
 */
const varakozok = new Map<Element, () => void>()
let figyel = false
let biztositek: number | undefined

function mutat(element: Element) {
  varakozok.get(element)?.()
  varakozok.delete(element)
}

let utemezve = false

/** Gorgeteskor kepkockankent legfeljebb egyszer nezzuk meg a helyzetet. */
function utemez() {
  if (utemezve) return
  utemezve = true
  window.requestAnimationFrame(() => {
    utemezve = false
    ellenoriz()
  })
}

function ellenoriz() {
  for (const element of [...varakozok.keys()]) {
    const rect = element.getBoundingClientRect()
    if (rect.top < window.innerHeight * KUSZOB && rect.bottom > 0) mutat(element)
  }
  if (varakozok.size === 0) leall()
}

function mindentMutat() {
  for (const element of [...varakozok.keys()]) mutat(element)
  leall()
}

function indul() {
  if (figyel) return
  figyel = true
  window.addEventListener('scroll', utemez, { passive: true })
  window.addEventListener('resize', utemez)
  document.addEventListener('visibilitychange', ellenoriz)
  biztositek = window.setTimeout(mindentMutat, BIZTOSITEK)
}

function leall() {
  if (!figyel) return
  figyel = false
  window.removeEventListener('scroll', utemez)
  window.removeEventListener('resize', utemez)
  document.removeEventListener('visibilitychange', ellenoriz)
  window.clearTimeout(biztositek)
}

function figyelj(element: Element, kesz: () => void) {
  varakozok.set(element, kesz)
  indul()
  return () => {
    varakozok.delete(element)
    if (varakozok.size === 0) leall()
  }
}

/** Alulrol beuszo megjelenes, amikor az elem a kepernyore er. */
export default function Reveal({ children, delay = 0, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const rect = element.getBoundingClientRect()
    if (rect.top < window.innerHeight * KUSZOB && rect.bottom > 0) {
      setShown(true)
      return
    }

    return figyelj(element, () => setShown(true))
  }, [])

  return (
    <div
      ref={ref}
      className={`${shown ? 'reveal reveal-in' : 'reveal'} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
