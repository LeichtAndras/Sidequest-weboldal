import Reveal from './Reveal'

type Props = { szam: string; szoveg: string; link?: string }

/** Merfoldko: nagy fehér szam kozvetlenul a falon, alatta kis felirat. */
export default function Milestone({ szam, szoveg, link }: Props) {
  // A hosszabb felirat kisebb alapmeretet kap, kulonben telefonon kilogna.
  const meret = szam.length <= 7 ? 'clamp(3rem, 15vw, 5rem)' : 'clamp(2.1rem, 10.2vw, 4rem)'

  const tartalom = (
    <>
      <span
        className="falon-szoveg inline-block font-display leading-none text-white transition duration-200 group-hover:scale-[1.04] group-hover:text-accent group-focus-visible:scale-[1.04] group-focus-visible:text-accent"
        style={{ fontSize: meret }}
      >
        {szam}
      </span>
      <p className="falon-szoveg mt-3 text-[0.88rem] font-medium tracking-wide text-cream">{szoveg}</p>
    </>
  )

  return (
    <div className="my-12 text-center">
      <Reveal>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="group block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {tartalom}
          </a>
        ) : (
          tartalom
        )}
      </Reveal>
    </div>
  )
}
