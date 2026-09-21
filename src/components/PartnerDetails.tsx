import type { Partner } from '../types'
import { InfoIcon, MapPinIcon } from './Icons'

type Props = { partner: Partner }

const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`

export default function PartnerDetails({ partner }: Props) {
  const steps = partner.steps?.filter((step) => step.trim() !== '') ?? []

  return (
    <div className="flex flex-col gap-4 border-t border-line pt-4">
      {partner.description ? (
        <p className="text-[0.9rem] leading-relaxed text-cream/70">{partner.description}</p>
      ) : null}

      {partner.address ? (
        <div>
          <p className="flex items-start gap-2 text-[0.9rem] leading-snug text-cream/70">
            <MapPinIcon className="h-4 w-4 shrink-0 translate-y-0.5 text-accent" />
            <span>{partner.address}</span>
          </p>
          <a
            href={mapsUrl(partner.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-accent/60 px-3.5 py-2 text-sm font-semibold text-accent transition active:scale-[0.97]"
          >
            <MapPinIcon className="h-4 w-4" />
            Megnyitás térképen
          </a>
        </div>
      ) : null}

      {steps.length > 0 ? (
        <div>
          <h3 className="text-[0.8rem] font-semibold tracking-wide text-cream">A beváltás lépései</h3>
          <ol className="mt-2 flex flex-col gap-2">
            {steps.map((step, index) => (
              <li key={step} className="flex items-start gap-2.5 text-[0.9rem] leading-snug text-cream/70">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[0.72rem] font-bold text-accent">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {partner.conditions ? (
        <p className="flex items-start gap-2 text-[0.85rem] leading-snug text-cream/70">
          <InfoIcon className="h-4 w-4 shrink-0 translate-y-0.5 text-accent" />
          <span>{partner.conditions}</span>
        </p>
      ) : null}
    </div>
  )
}
