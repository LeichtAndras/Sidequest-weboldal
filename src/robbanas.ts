/**
 * A kedvezmeny badge csillag alakja. A kartyak es a mozi blokk is ezt
 * hasznalja, hogy egyforma legyen a ket helyen.
 */
export function robbanasUt(agak = 13, kulsoX = 63, kulsoY = 45, aranyBelso = 0.755) {
  const pontok: string[] = []
  for (let i = 0; i < agak * 2; i++) {
    const kulso = i % 2 === 0 ? 1 : aranyBelso
    const tenyezo = kulso * (1 + 0.07 * Math.sin(i * 2.3))
    const szog = (Math.PI * i) / agak - Math.PI / 2
    pontok.push(
      `${(70 + kulsoX * tenyezo * Math.cos(szog)).toFixed(2)},${(50 + kulsoY * tenyezo * Math.sin(szog)).toFixed(2)}`,
    )
  }
  return `M${pontok.join('L')}Z`
}

/** Elore kiszamolt alak, minden hasznalati helyen ugyanaz. */
export const ROBBANAS = robbanasUt()
