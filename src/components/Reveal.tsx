import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
}

/**
 * Gorgeteskor beuszo elem. IntersectionObserver figyeli, gorgeteskor
 * semmit nem szamolunk, es csak opacity meg transform valtozik.
 * Vegso biztositek: ha a megfigyelo nem jelezne, ket masodperc utan latszik.
 */
export default function Reveal({ children, className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [latszik, setLatszik] = useState(false)

  useEffect(() => {
    const elem = ref.current
    if (!elem) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLatszik(true)
      return
    }

    const figyelo = new IntersectionObserver(
      (bejegyzesek) => {
        for (const bejegyzes of bejegyzesek) {
          if (bejegyzes.isIntersecting) {
            setLatszik(true)
            figyelo.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )

    figyelo.observe(elem)
    const biztositek = window.setTimeout(() => setLatszik(true), 2000)

    return () => {
      figyelo.disconnect()
      window.clearTimeout(biztositek)
    }
  }, [])

  return (
    <div ref={ref} className={`reveal ${latszik ? 'reveal-in' : ''} ${className}`.trim()}>
      {children}
    </div>
  )
}
