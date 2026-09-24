type Props = { szoveg: string }

/** Merfoldko az uton: nem kartya, hanem felfestett felirat. */
export default function Milestone({ szoveg }: Props) {
  return (
    <div className="relative py-6 text-center">
      <p
        className="inline-block font-display text-[1.35rem] leading-tight text-accent"
        style={{
          transform: 'rotate(-1.5deg)',
          textShadow: '0 0 18px rgba(54,185,240,0.55), 0 2px 0 rgba(5,32,46,0.9)',
        }}
      >
        {szoveg}
      </p>
    </div>
  )
}
