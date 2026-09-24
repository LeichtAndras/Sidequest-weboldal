type Props = { szoveg: string }

/** Merfoldko az uton: felfestett felirat sotet tablan, hogy elvaljon az uttol. */
export default function Milestone({ szoveg }: Props) {
  return (
    <div className="relative py-7 text-center">
      <p
        className="inline-block rounded-[6px] border-2 border-accent/70 bg-ink px-4 py-2 font-display text-[1.15rem] leading-tight text-accent shadow-[0_6px_16px_rgba(0,0,0,0.6)]"
        style={{ transform: 'rotate(-1.5deg)', textShadow: '0 0 14px rgba(54,185,240,0.45)' }}
      >
        {szoveg}
      </p>
    </div>
  )
}
