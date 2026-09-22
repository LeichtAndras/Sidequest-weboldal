import { useState } from 'react'
import type { Partner } from '../types'
import CouponCode from './CouponCode'
import PartnerDetails from './PartnerDetails'
import { ChevronIcon, QrIcon, SpeechIcon, TagIcon } from './Icons'

type Props = {
  partner: Partner
  featured?: boolean
  open: boolean
  onToggle: () => void
}

function RedeemIcon({ partner }: { partner: Partner }) {
  const className = 'h-4 w-4 shrink-0 translate-y-0.5 text-accent'
  if (partner.code) return <TagIcon className={className} />
  if (partner.redeem.includes('QR')) return <QrIcon className={className} />
  return <SpeechIcon className={className} />
}

export function hasDetails(partner: Partner) {
  return Boolean(
    partner.description?.trim() ||
      partner.address?.trim() ||
      partner.conditions?.trim() ||
      partner.steps?.some((step) => step.trim() !== ''),
  )
}

export default function PartnerCard({ partner, featured = false, open, onToggle }: Props) {
  const [imageFailed, setImageFailed] = useState(false)
  const value = partner.discount.replace(/[^\d.,]/g, '')
  const unit = partner.discount.replace(/[\d.,]/g, '')
  const expandable = hasDetails(partner)
  const panelId = `reszletek-${partner.name.replace(/\s+/g, '-').toLowerCase()}`

  const head = (
    <>
      {partner.image && !imageFailed ? (
        <div className="relative">
          <img
            src={partner.image}
            alt={partner.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
            style={partner.imagePosition ? { objectPosition: partner.imagePosition } : undefined}
            className={`h-[140px] w-full object-cover ${
              partner.brightenImage ? 'brightness-[1.35] contrast-[1.15] saturate-[1.1]' : ''
            }`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-b from-transparent to-surface" />
        </div>
      ) : null}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5">
            <h2 className="text-[1.08rem] leading-tight font-semibold text-cream">{partner.name}</h2>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[0.7rem] font-medium text-accent">
              {partner.category}
            </span>
          </div>
          <p className="shrink-0 text-right leading-none font-extrabold tracking-tight text-accent tabular-nums">
            <span className="text-[2.3rem]">{value}</span>
            <span className="text-[1.3rem]">{unit}</span>
          </p>
        </div>

        <div className="mt-3 flex items-start justify-between gap-2.5">
          <p className="flex items-start gap-2 text-[0.9rem] leading-snug text-cream/70">
            <RedeemIcon partner={partner} />
            <span>{partner.redeem}</span>
          </p>
          {expandable ? (
            <ChevronIcon
              className={`h-5 w-5 shrink-0 text-cream/70 transition-transform duration-200 ${
                open ? 'rotate-180' : ''
              }`}
            />
          ) : null}
        </div>
      </div>
    </>
  )

  return (
    <article
      className={`overflow-hidden rounded-2xl bg-surface ${
        featured ? 'border border-accent' : 'border border-line'
      }`}
    >
      {expandable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="block w-full cursor-pointer text-left"
        >
          {head}
        </button>
      ) : (
        <div>{head}</div>
      )}

      {partner.code ? (
        <div className="px-4 pb-4">
          <CouponCode code={partner.code} />
        </div>
      ) : null}

      {expandable ? (
        <div
          id={panelId}
          inert={!open}
          className={`grid px-4 transition-all duration-200 ease-out ${
            open ? 'grid-rows-[1fr] pb-4 opacity-100' : 'grid-rows-[0fr] pb-0 opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <PartnerDetails partner={partner} />
          </div>
        </div>
      ) : null}
    </article>
  )
}
