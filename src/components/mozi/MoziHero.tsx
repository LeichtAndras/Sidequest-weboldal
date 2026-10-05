import { beallitas } from '../../mozi/beallitas'

type Props = {
  /** A kepre es a helyorzore egyarant ez az osztaly kerul. */
  className: string
}

/**
 * A filmszavazas hero kepe. A webp valtozatok mellett png tartalek all,
 * mert a kep atlatszo. Sosem vagjuk meg: a szelesseghez igazodik, a
 * magassag pedig koveti az aranyat.
 *
 * A beallitasban a nagy webp utvonala all, a tobbi ebbol szarmazik:
 * hero-1600.webp -> hero-900.webp es hero-1600.png
 */
export default function MoziHero({ className }: Props) {
  const nagy = beallitas.heroImage
  if (!nagy) return <div className={`${className} mozi-hero-ures`} aria-hidden="true" />

  const kicsi = nagy.replace(/-1600\.webp$/, '-900.webp')
  const tartalek = nagy.replace(/\.webp$/, '.png')

  return (
    <picture>
      <source type="image/webp" srcSet={`${kicsi} 900w, ${nagy} 1600w`} sizes="(min-width: 768px) 1120px, 92vw" />
      <img
        className={className}
        src={tartalek}
        alt={`SideQuest filmest a ${beallitas.venue} moziban, te választod a filmet`}
        width={1920}
        height={1080}
        loading="lazy"
        decoding="async"
      />
    </picture>
  )
}
