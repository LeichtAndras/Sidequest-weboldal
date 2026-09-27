type Props = {
  szoveg: string
  /** Kisebb feliratokhoz vekonyabb korvonal. */
  kicsi?: boolean
  /**
   * vilagos: feher kitoltes, vilagoskek es sotetkek korvonal, a kartyan.
   * sotet: sotetkek kitoltes, vekony vilagoskek korvonal, vilagos hatteren.
   */
  valtozat?: 'vilagos' | 'sotet'
  style?: React.CSSProperties
  className?: string
}

/**
 * Feliratdoboz a referencia stilusaban. A vilagos valtozatnal ket egymasra
 * tett szoveg adja a ket korvonalat, a sotetnel egy is eleg.
 */
export default function Felirat({
  szoveg,
  kicsi = false,
  valtozat = 'vilagos',
  style,
  className = '',
}: Props) {
  const osztalyok = [
    'tn-felirat',
    kicsi ? 'tn-felirat-kicsi' : '',
    valtozat === 'sotet' ? 'tn-felirat-sotet' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={osztalyok} style={style}>
      {valtozat === 'vilagos' ? (
        <span className="tn-felirat-hatso" aria-hidden="true">
          {szoveg}
        </span>
      ) : null}
      <span className="tn-felirat-elso">{szoveg}</span>
    </span>
  )
}
