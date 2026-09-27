import Reveal from './Reveal'

type Props = { szam: string; szoveg: string }

/** Merfoldko: nagy fehér szam kozvetlenul a falon, alatta kis felirat. */
export default function Milestone({ szam, szoveg }: Props) {
  return (
    <div className="my-12 text-center">
      <Reveal>
        <span
          className="block font-display leading-none text-white"
          style={{ fontSize: 'clamp(3rem, 15vw, 5rem)' }}
        >
          {szam}
        </span>
        <p className="mt-3 text-[0.88rem] font-medium tracking-wide text-cream">{szoveg}</p>
      </Reveal>
    </div>
  )
}
