import { useEffect, useState } from 'react'

let vaszon: CanvasRenderingContext2D | null | undefined

/**
 * Egy nagybetus szoveg szelessege cqw-ben, ha a betumeret 1cqw. A szelesseg
 * egyenesen aranyos a betumerettel, ezert ebbol barmelyik merethez ki lehet
 * szamolni a helyigenyt. Vaszonra merunk, tehat a valodi betut nezzuk, nem
 * karakterszamot becsulunk.
 */
export function szovegSzeles(szoveg: string) {
  const nagy = szoveg.toUpperCase()
  if (vaszon === undefined) vaszon = document.createElement('canvas').getContext('2d')
  // Ha nincs vaszon, ovatos becsles: a legszelesebb betukkel szamolunk
  if (!vaszon) return nagy.length * 0.7

  // Nagyobb mereten merunk, majd visszaosztunk, igy pontosabb
  vaszon.font = '100px "Titan One", "Arial Black", system-ui, sans-serif'
  return vaszon.measureText(nagy).width / 100
}

/**
 * Betoltottek-e mar a betuk. Amig nem, a meres a tartalek betuvel szamol,
 * ezert a betoltes utan egyszer ujraszamolunk.
 */
export function useBetuKesz() {
  const [kesz, setKesz] = useState(false)

  useEffect(() => {
    let el = true
    document.fonts.ready.then(() => {
      if (el) setKesz(true)
    })
    return () => {
      el = false
    }
  }, [])

  return kesz
}
